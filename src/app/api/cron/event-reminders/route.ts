import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

/**
 * Call this hourly from an external scheduler (cron-job.org, Vercel Cron, etc.)
 * with header:  Authorization: Bearer <CRON_SECRET>
 *
 * Looks for events starting 23–25 hours from now (a 2-hour window absorbs
 * scheduler drift), emails the owner + any shared participant, and records
 * each send in sent_event_reminders so nobody gets emailed twice.
 *
 * Note: only events with a start_time set can get a reminder — an all-day /
 * no-time event has no specific moment to count "24 hours before" from.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY is not set on this deployment" }, { status: 500 });
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set on this deployment" }, { status: 500 });
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: "NEXT_PUBLIC_SUPABASE_URL is not set on this deployment" }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const supabase = serviceClient();
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    // Coarse date-range filter first (cheap), exact time filtered below.
    const { data: candidates, error } = await supabase
      .from("events")
      .select("id, title, event_date, start_time, owner_id")
      .not("start_time", "is", null)
      .gte("event_date", windowStart.toISOString().slice(0, 10))
      .lte("event_date", windowEnd.toISOString().slice(0, 10));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let remindersSent = 0;

    for (const ev of candidates ?? []) {
      const eventMoment = new Date(`${ev.event_date}T${ev.start_time}`);
      if (eventMoment < windowStart || eventMoment > windowEnd) continue;

      const { data: participants } = await supabase
        .from("event_participants")
        .select("user_id")
        .eq("event_id", ev.id);

      const recipientIds = Array.from(new Set([ev.owner_id, ...(participants ?? []).map((p) => p.user_id)]));

      for (const userId of recipientIds) {
        const { data: alreadySent } = await supabase
          .from("sent_event_reminders")
          .select("event_id")
          .eq("event_id", ev.id)
          .eq("user_id", userId)
          .maybeSingle();
        if (alreadySent) continue;

        const { data: userResult } = await supabase.auth.admin.getUserById(userId);
        const email = userResult?.user?.email;
        if (!email) continue;

        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? "Together <onboarding@resend.dev>",
          to: email,
          subject: `Reminder: "${ev.title}" is coming up`,
          html: `<p>Just a heads-up — <strong>${ev.title}</strong> is scheduled for ${ev.event_date} at ${ev.start_time?.slice(
            0,
            5
          )}, about 24 hours from now.</p>`,
        });

        await supabase.from("sent_event_reminders").insert({ event_id: ev.id, user_id: userId });
        remindersSent++;
      }
    }

    return NextResponse.json({ checked: candidates?.length ?? 0, remindersSent });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
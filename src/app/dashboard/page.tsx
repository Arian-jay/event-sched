import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EventCalendar } from "@/components/calendar/EventCalendar";
import type { Profile } from "@/types/supabase";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/login");

  return <EventCalendar profile={profile as Profile} />;
}

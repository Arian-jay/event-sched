"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn, toDateKey } from "@/lib/utils";
import { EventDialog } from "./EventDialog";
import type { EventItem, Profile, Connection } from "@/types/supabase";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function EventCalendar({ profile }: { profile: Profile }) {
  const supabase = createClient();
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [events, setEvents] = useState<EventItem[]>([]);
  const [connections, setConnections] = useState<Profile[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadEvents() {
    const { data } = await supabase
      .from("events")
      .select("*, owner:profiles!events_owner_id_fkey(id, username, full_name, avatar_url)")
      .order("event_date", { ascending: true });
    setEvents((data as unknown as EventItem[]) ?? []);
  }

  async function loadConnections() {
    const { data } = await supabase
      .from("connections")
      .select("*, requester:profiles!connections_requester_id_fkey(*), addressee:profiles!connections_addressee_id_fkey(*)")
      .eq("status", "accepted")
      .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);

    const partners = (data as unknown as Connection[] ?? []).map((c) =>
      c.requester_id === profile.id ? c.addressee! : c.requester!
    );
    setConnections(partners);
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([loadEvents(), loadConnections()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const ev of events) {
      const list = map.get(ev.event_date) ?? [];
      list.push(ev);
      map.set(ev.event_date, list);
    }
    return map;
  }, [events]);

  const days = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const todayKey = toDateKey(new Date());

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          {monthCursor.toLocaleString("default", { month: "long", year: "numeric" })}
        </h1>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => shiftMonth(setMonthCursor, -1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMonthCursor(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => shiftMonth(setMonthCursor, 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      <div className={cn("grid grid-cols-7 gap-1", loading && "opacity-50")}>
        {days.map(({ date, inMonth }) => {
          const key = toDateKey(date);
          const dayEvents = eventsByDate.get(key) ?? [];
          const isToday = key === todayKey;

          return (
            <button
              key={key}
              onClick={() => setSelectedDate(date)}
              className={cn(
                "flex h-14 flex-col items-start gap-1 rounded-md border border-transparent p-1.5 text-left transition-colors hover:border-border hover:bg-secondary sm:h-16",
                !inMonth && "opacity-35",
                isToday && "border-accent bg-accent/10"
              )}
            >
              <span className={cn("text-sm font-medium", isToday && "text-accent")}>{date.getDate()}</span>
              <div className="flex flex-wrap gap-1">
                {dayEvents.slice(0, 3).map((ev) => (
                  <span
                    key={ev.id}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: ev.owner_id === profile.id ? "#D9A441" : "#B3416B" }}
                    title={ev.title}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#D9A441]" /> Your events
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#B3416B]" /> Shared with you
        </span>
      </div>

      {selectedDate && (
        <EventDialog
          date={selectedDate}
          profile={profile}
          connections={connections}
          events={eventsByDate.get(toDateKey(selectedDate)) ?? []}
          onClose={() => setSelectedDate(null)}
          onChanged={loadEvents}
        />
      )}
    </div>
  );
}

function buildMonthGrid(cursor: Date) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + i);
    return { date, inMonth: date.getMonth() === month };
  });
}

function shiftMonth(setCursor: (fn: (d: Date) => Date) => void, delta: number) {
  setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
}

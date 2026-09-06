import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistanceToNow(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  const intervals: [number, string][] = [
    [31536000, "y"],
    [2592000, "mo"],
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
  ];
  for (const [secs, label] of intervals) {
    const value = Math.floor(seconds / secs);
    if (value >= 1) return `${value}${label} ago`;
  }
  return "just now";
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Combines an event's date (+ optional end/start time) into a real Date for comparison. */
function eventEndDateTime(ev: { event_date: string; start_time: string | null; end_time: string | null }): Date {
  const time = ev.end_time ?? ev.start_time ?? "23:59:59";
  return new Date(`${ev.event_date}T${time.length === 5 ? `${time}:00` : time}`);
}

export function isEventExpired(
  ev: { event_date: string; start_time: string | null; end_time: string | null },
  now: Date = new Date()
): boolean {
  return eventEndDateTime(ev).getTime() < now.getTime();
}

/** True if two same-day events' time ranges overlap. Events with no time set never conflict. */
export function eventsOverlap(
  a: { start_time: string | null; end_time: string | null },
  b: { start_time: string | null; end_time: string | null }
): boolean {
  if (!a.start_time || !b.start_time) return false;

  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const aStart = toMinutes(a.start_time);
  const aEnd = a.end_time ? toMinutes(a.end_time) : aStart;
  const bStart = toMinutes(b.start_time);
  const bEnd = b.end_time ? toMinutes(b.end_time) : bStart;

  return aStart < bEnd && bStart < aEnd;
}
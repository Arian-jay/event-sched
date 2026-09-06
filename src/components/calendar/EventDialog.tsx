"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EventForm, type EventFormValues } from "./EventForm";
import { toDateKey, isEventExpired, eventsOverlap, cn } from "@/lib/utils";
import type { EventItem, Profile } from "@/types/supabase";

export function EventDialog({
  date,
  profile,
  connections,
  events,
  onClose,
  onChanged,
}: {
  date: Date;
  profile: Profile;
  connections: Profile[];
  events: EventItem[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const supabase = createClient();
  const [showCreateForm, setShowCreateForm] = useState(events.length === 0);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [editingDefaults, setEditingDefaults] = useState<EventFormValues | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  const dateLabel = date.toLocaleDateString("default", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function conflictsWithOthers(values: { startTime: string; endTime: string }, excludeId?: string): boolean {
    const candidate = { start_time: values.startTime || null, end_time: values.endTime || null };
    return events
      .filter((ev) => ev.id !== excludeId)
      .some((ev) => eventsOverlap(candidate, { start_time: ev.start_time, end_time: ev.end_time }));
  }

  async function startEditing(ev: EventItem) {
    setLoadingEdit(true);
    setShowCreateForm(false);
    setConflictNotice(null);

    const { data: participants } = await supabase
      .from("event_participants")
      .select("user_id")
      .eq("event_id", ev.id)
      .limit(1);

    setEditingDefaults({
      title: ev.title,
      description: ev.description ?? "",
      startTime: ev.start_time?.slice(0, 5) ?? "",
      endTime: ev.end_time?.slice(0, 5) ?? "",
      shareWith: participants?.[0]?.user_id ?? "none",
    });
    setEditingEventId(ev.id);
    setLoadingEdit(false);
  }

  async function handleCreate(values: EventFormValues) {
    const hasConflict = conflictsWithOthers(values);

    const { data: newEvent, error: insertError } = await supabase
      .from("events")
      .insert({
        owner_id: profile.id,
        title: values.title,
        description: values.description || null,
        event_date: toDateKey(date),
        start_time: values.startTime || null,
        end_time: values.endTime || null,
        visibility: values.shareWith !== "none" ? "shared" : "private",
      })
      .select()
      .single();

    if (insertError || !newEvent) {
      return insertError?.message ?? "Could not create event";
    }

    if (values.shareWith !== "none") {
      await supabase.from("event_participants").insert({
        event_id: newEvent.id,
        user_id: values.shareWith,
      });
    }

    setConflictNotice(
      hasConflict ? "Saved — but this overlaps with another event already on this day." : null
    );
    setShowCreateForm(false);
    onChanged();
  }

  async function handleUpdate(eventId: string, values: EventFormValues) {
    const hasConflict = conflictsWithOthers(values, eventId);

    const { error: updateError } = await supabase
      .from("events")
      .update({
        title: values.title,
        description: values.description || null,
        start_time: values.startTime || null,
        end_time: values.endTime || null,
        visibility: values.shareWith !== "none" ? "shared" : "private",
      })
      .eq("id", eventId);

    if (updateError) return updateError.message;

    await supabase.from("event_participants").delete().eq("event_id", eventId);
    if (values.shareWith !== "none") {
      const { error: shareError } = await supabase
        .from("event_participants")
        .insert({ event_id: eventId, user_id: values.shareWith });
      if (shareError) return shareError.message;
    }

    setConflictNotice(
      hasConflict ? "Saved — but this overlaps with another event already on this day." : null
    );
    setEditingEventId(null);
    setEditingDefaults(null);
    onChanged();
  }

  async function handleDelete(eventId: string) {
    await supabase.from("events").delete().eq("id", eventId);
    onChanged();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dateLabel}</DialogTitle>
          <DialogDescription>
            {events.length === 0
              ? "Nothing scheduled yet."
              : `${events.length} event${events.length > 1 ? "s" : ""} on this day.`}
          </DialogDescription>
        </DialogHeader>

        {conflictNotice && (
          <Alert variant="destructive">
            <AlertDescription>{conflictNotice}</AlertDescription>
          </Alert>
        )}

        {events.length > 0 && (
          <div className="flex flex-col gap-3">
            {events.map((ev) => {
              const isEditingThis = editingEventId === ev.id;
              const expired = isEventExpired(ev);
              const conflicting = events.some(
                (other) =>
                  other.id !== ev.id &&
                  eventsOverlap(
                    { start_time: ev.start_time, end_time: ev.end_time },
                    { start_time: other.start_time, end_time: other.end_time }
                  )
              );

              if (isEditingThis && editingDefaults) {
                return (
                  <div key={ev.id}>
                    <p className="mb-2 text-sm font-medium">Editing &ldquo;{ev.title}&rdquo;</p>
                    <EventForm
                      initialValues={editingDefaults}
                      connections={connections}
                      submitLabel="Save changes"
                      onSubmit={(values) => handleUpdate(ev.id, values)}
                      onCancel={() => {
                        setEditingEventId(null);
                        setEditingDefaults(null);
                      }}
                    />
                  </div>
                );
              }

              return (
                <div
                  key={ev.id}
                  className="flex items-start justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex gap-3">
                    <span
                      className="mt-1 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: expired ? "#DC2626" : ev.color }}
                    />
                    <div>
                      <p className={cn("font-medium", expired && "text-muted-foreground line-through")}>
                        {ev.title}
                      </p>
                      {(ev.start_time || ev.end_time) && (
                        <p className="text-xs text-muted-foreground">
                          {ev.start_time?.slice(0, 5)} {ev.end_time && `– ${ev.end_time.slice(0, 5)}`}
                        </p>
                      )}
                      {ev.description && <p className="mt-1 text-sm text-muted-foreground">{ev.description}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {ev.owner_id === profile.id ? (
                          <Badge variant="accent">Your event</Badge>
                        ) : (
                          <Badge variant="default" className="bg-primary">
                            Shared by {ev.owner?.username}
                          </Badge>
                        )}
                        {expired && <Badge variant="destructive">Expired</Badge>}
                        {!expired && conflicting && <Badge variant="destructive">Conflict</Badge>}
                      </div>
                    </div>
                  </div>
                  {ev.owner_id === profile.id && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" disabled={loadingEdit} onClick={() => startEditing(ev)}>
                        Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(ev.id)}>
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!showCreateForm && !editingEventId && (
          <Button variant="outline" onClick={() => setShowCreateForm(true)}>
            + Add an event
          </Button>
        )}

        {showCreateForm && (
          <EventForm
            initialValues={{ title: "", description: "", startTime: "", endTime: "", shareWith: "none" }}
            connections={connections}
            submitLabel="Save event"
            onSubmit={handleCreate}
            onCancel={() => setShowCreateForm(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogFooter } from "@/components/ui/dialog";
import type { Profile } from "@/types/supabase";

export interface EventFormValues {
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  shareWith: string;
}

export function EventForm({
  initialValues,
  connections,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initialValues: EventFormValues;
  connections: Profile[];
  submitLabel: string;
  onSubmit: (values: EventFormValues) => Promise<string | void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [startTime, setStartTime] = useState(initialValues.startTime);
  const [endTime, setEndTime] = useState(initialValues.endTime);
  const [shareWith, setShareWith] = useState(initialValues.shareWith);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const errMsg = await onSubmit({ title, description, startTime, endTime, shareWith });
    setSaving(false);
    if (errMsg) setError(errMsg);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 border-t border-border pt-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="title">Title</Label>
          <span className="text-xs text-muted-foreground">{title.length}/80</span>
        </div>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Dinner reservation"
          maxLength={80}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="startTime">Start</Label>
          <Input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endTime">End</Label>
          <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="description">Notes</Label>
          <span className="text-xs text-muted-foreground">{description.length}/300</span>
        </div>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={300}
        />
      </div>

      <div className="grid gap-2">
        <Label>Share with</Label>
        <Select value={shareWith} onValueChange={setShareWith}>
          <SelectTrigger>
            <SelectValue placeholder="Just me" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Just me</SelectItem>
            {connections.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[10px]">{c.username[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  @{c.username}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {connections.length === 0 && (
          <p className="text-xs text-muted-foreground">Connect with someone first to share events with them.</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
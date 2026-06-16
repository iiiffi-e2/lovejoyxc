"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import {
  createScheduleEvent,
  updateScheduleEvent,
  type ScheduleState,
} from "@/app/actions/schedule";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import type { ScheduleEventCardData } from "./schedule-event-card";
import { toDateInputValue } from "@/lib/format";

export function ScheduleEventForm({
  event,
  onCancel,
}: {
  event?: ScheduleEventCardData;
  onCancel?: () => void;
}) {
  const action = event ? updateScheduleEvent : createScheduleEvent;
  const [state, formAction] = useActionState(action, {} as ScheduleState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      onCancel?.();
    }
  }, [state.ok, onCancel]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="type">Type</Label>
          <Select id="type" name="type" defaultValue={event?.type ?? "PRACTICE"} required>
            <option value="PRACTICE">Practice</option>
            <option value="MEET">Meet</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            defaultValue={event ? toDateInputValue(event.date) : undefined}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            placeholder="Morning practice"
            defaultValue={event?.title}
            required
          />
        </div>
        <div>
          <Label htmlFor="startTime">Start time (optional)</Label>
          <Input
            id="startTime"
            name="startTime"
            type="time"
            defaultValue={event?.startTime ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="endTime">End time (optional)</Label>
          <Input
            id="endTime"
            name="endTime"
            type="time"
            defaultValue={event?.endTime ?? ""}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="location">Location (optional)</Label>
          <Input
            id="location"
            name="location"
            placeholder="Lovejoy HS track"
            defaultValue={event?.location ?? ""}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Bring spikes, bus leaves at 2:30…"
            defaultValue={event?.notes ?? ""}
          />
        </div>
      </div>
      {state.error ? (
        <p className="text-sm font-medium text-injury">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm font-medium text-success">Event saved.</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <SubmitButton editing={!!event} />
        {event && onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function SubmitButton({ editing }: { editing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      <Plus className="h-4 w-4" />
      {pending ? "Saving…" : editing ? "Update event" : "Add event"}
    </Button>
  );
}

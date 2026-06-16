"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { addCoachNote, deleteCoachNote, type NoteState } from "@/app/actions/coach";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { formatDate } from "@/lib/format";

export type CoachNoteItem = {
  id: string;
  note: string;
  createdAt: Date;
  coach: { name: string };
};

export function CoachNotes({
  athleteId,
  notes,
}: {
  athleteId: string;
  notes: CoachNoteItem[];
}) {
  const [state, formAction] = useActionState(addCoachNote, {} as NoteState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} className="space-y-3">
        <input type="hidden" name="athleteId" value={athleteId} />
        <Textarea
          name="note"
          placeholder="Private note for your coaching staff…"
          required
        />
        {state.error ? (
          <p className="text-sm font-medium text-injury">{state.error}</p>
        ) : null}
        <SubmitButton />
      </form>

      {notes.length > 0 ? (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-xl border border-line bg-surface/60 p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-700">{n.note}</p>
                <form action={deleteCoachNote.bind(null, n.id)}>
                  <button
                    type="submit"
                    aria-label="Delete note"
                    className="text-gray-300 hover:text-injury"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                {n.coach.name} · {formatDate(n.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">No notes yet.</p>
      )}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      <Plus className="h-4 w-4" />
      {pending ? "Saving…" : "Add note"}
    </Button>
  );
}

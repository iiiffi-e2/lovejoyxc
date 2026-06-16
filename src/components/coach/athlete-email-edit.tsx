"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import {
  updateAthleteEmail,
  type EmailState,
} from "@/app/actions/coach";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export function AthleteEmailEdit({
  athleteId,
  email,
}: {
  athleteId: string;
  email: string;
}) {
  const [state, formAction] = useActionState(updateAthleteEmail, {} as EmailState);

  return (
    <form action={formAction} className="mt-1 flex flex-wrap items-center gap-2">
      <input type="hidden" name="athleteId" value={athleteId} />
      <Input
        name="email"
        type="email"
        defaultValue={email}
        required
        className="h-9 max-w-xs text-sm"
      />
      <SubmitButton />
      {state.error ? (
        <p className="w-full text-sm font-medium text-injury">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="flex w-full items-center gap-1 text-sm font-medium text-success">
          <Check className="h-4 w-4" />
          Email updated
        </p>
      ) : null}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="secondary" disabled={pending}>
      {pending ? "Saving…" : "Save"}
    </Button>
  );
}

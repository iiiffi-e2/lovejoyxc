"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Plus } from "lucide-react";
import { createTeam, type AdminState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function TeamForm() {
  const [state, formAction] = useActionState(createTeam, {} as AdminState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="name">Team name</Label>
          <Input id="name" name="name" placeholder="Varsity Boys" required />
        </div>
        <div>
          <Label htmlFor="season">Season</Label>
          <Input id="season" name="season" placeholder="Cross Country" required />
        </div>
        <div>
          <Label htmlFor="schoolYear">School year</Label>
          <Input id="schoolYear" name="schoolYear" placeholder="2025-2026" required />
        </div>
      </div>
      {state.error ? (
        <p className="text-sm font-medium text-injury">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm font-medium text-success">Team created.</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="md" disabled={pending}>
      <Plus className="h-4 w-4" />
      {pending ? "Creating…" : "Create team"}
    </Button>
  );
}

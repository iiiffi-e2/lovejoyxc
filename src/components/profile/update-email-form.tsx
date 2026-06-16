"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { updateEmailAction, type ProfileState } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

export function UpdateEmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, formAction] = useActionState(updateEmailAction, {} as ProfileState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form key={currentEmail} ref={formRef} action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={currentEmail}
          required
        />
      </div>
      <div>
        <Label htmlFor="emailCurrentPassword">Current password</Label>
        <Input
          id="emailCurrentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          placeholder="Confirm with your password"
          required
        />
      </div>

      {state.error ? (
        <p className="text-sm font-medium text-injury">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm font-medium text-success">Email updated.</p>
      ) : null}

      <SubmitButton label="Update email" />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

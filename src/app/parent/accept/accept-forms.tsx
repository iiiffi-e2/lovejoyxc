"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";
import {
  loginAndAcceptParentInvite,
  signupAndAcceptParentInvite,
  type ParentActionState,
} from "@/app/actions/parent";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";

const initial: ParentActionState = {};

export function AcceptForms({
  token,
  email,
  mode,
}: {
  token: string;
  email: string;
  mode: "signup" | "login";
}) {
  if (mode === "login") {
    return <AcceptLoginForm token={token} email={email} />;
  }
  return <AcceptSignupForm token={token} email={email} />;
}

function AcceptSignupForm({ token, email }: { token: string; email: string }) {
  const [state, formAction] = useActionState(signupAndAcceptParentInvite, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" type="text" autoComplete="name" required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" value={email} readOnly />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      {state.error ? <ErrorMessage message={state.error} /> : null}
      <SubmitButton label="Create account & accept" pendingLabel="Creating account…" />
    </form>
  );
}

function AcceptLoginForm({ token, email }: { token: string; email: string }) {
  const [state, formAction] = useActionState(loginAndAcceptParentInvite, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" value={email} readOnly />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state.error ? <ErrorMessage message={state.error} /> : null}
      <SubmitButton label="Sign in & accept" pendingLabel="Signing in…" />
    </form>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-injury">
      <AlertCircle className="h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

function SubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  );
}

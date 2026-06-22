"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle } from "lucide-react";
import { signupAction, type SignupState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";

const initial: SignupState = {};

export function SignupForm({
  defaultInviteCode,
}: {
  defaultInviteCode?: string;
}) {
  const [state, formAction] = useActionState(signupAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="inviteCode">Team invite code</Label>
        <Input
          id="inviteCode"
          name="inviteCode"
          type="text"
          autoComplete="off"
          placeholder="LJXC-XXXXXX"
          defaultValue={defaultInviteCode}
          required
        />
      </div>
      <div>
        <Label htmlFor="name">Full name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          required
        />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@lovejoyxc.app"
          required
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          required
        />
      </div>
      <div>
        <Label htmlFor="grade">Grade</Label>
        <Select id="grade" name="grade" defaultValue="" required>
          <option value="" disabled>
            Select grade
          </option>
          {[7, 8, 9, 10, 11, 12].map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </div>

      {state.error ? (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-injury">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

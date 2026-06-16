"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import type { AdminState } from "@/app/actions/admin";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/field";
import {
  GENDER_TEAM_LABEL,
  ROLE_LABEL,
  TEAM_GROUP_LABEL,
  enumOptions,
} from "@/lib/labels";

type Action = (prev: AdminState, formData: FormData) => Promise<AdminState>;

export type UserDefaults = {
  name?: string;
  email?: string;
  role?: string;
  grade?: number | null;
  genderTeam?: string | null;
  teamGroup?: string | null;
  teamId?: string | null;
};

export function UserForm({
  action,
  teams,
  defaults,
  mode,
}: {
  action: Action;
  teams: { id: string; name: string }[];
  defaults?: UserDefaults;
  mode: "create" | "edit";
}) {
  const [state, formAction] = useActionState(action, {} as AdminState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && mode === "create") formRef.current?.reset();
  }, [state.ok, mode]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" defaultValue={defaults?.name} required />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={defaults?.email}
            required
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="role">Role</Label>
          <Select id="role" name="role" defaultValue={defaults?.role ?? "ATHLETE"}>
            {enumOptions(ROLE_LABEL).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="password">
            {mode === "create" ? "Password" : "New password (optional)"}
          </Label>
          <Input
            id="password"
            name="password"
            type="text"
            placeholder={mode === "create" ? "min 6 characters" : "leave blank to keep"}
            required={mode === "create"}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="grade">Grade</Label>
          <Select id="grade" name="grade" defaultValue={defaults?.grade ?? ""}>
            <option value="">—</option>
            {[7, 8, 9, 10, 11, 12].map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="teamGroup">Group</Label>
          <Select
            id="teamGroup"
            name="teamGroup"
            defaultValue={defaults?.teamGroup ?? ""}
          >
            <option value="">—</option>
            {enumOptions(TEAM_GROUP_LABEL).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="genderTeam">Team</Label>
          <Select
            id="genderTeam"
            name="genderTeam"
            defaultValue={defaults?.genderTeam ?? ""}
          >
            <option value="">—</option>
            {enumOptions(GENDER_TEAM_LABEL).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="teamId">Team / season</Label>
        <Select id="teamId" name="teamId" defaultValue={defaults?.teamId ?? ""}>
          <option value="">No team assigned</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>

      {state.error ? (
        <p className="text-sm font-medium text-injury">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="text-sm font-medium text-success">
          {mode === "create" ? "Person added." : "Saved."}
        </p>
      ) : null}

      <SubmitButton label={mode === "create" ? "Add person" : "Save changes"} />
    </form>
  );
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="md" disabled={pending}>
      <Check className="h-4 w-4" />
      {pending ? "Saving…" : label}
    </Button>
  );
}

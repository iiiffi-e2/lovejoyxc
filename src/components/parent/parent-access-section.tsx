"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Check } from "lucide-react";
import {
  inviteParent,
  resendParentInvite,
  revokeParentInvite,
  revokeParentLink,
  type ParentActionState,
} from "@/app/actions/parent";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/field";
import { formatDate } from "@/lib/format";

type ParentAccessData = {
  links: {
    id: string;
    createdAt: Date;
    parent: { id: string; name: string; email: string };
  }[];
  pendingInvites: {
    id: string;
    email: string;
    createdAt: Date;
    expiresAt: Date;
  }[];
};

export function ParentAccessSection({
  athleteId,
  data,
}: {
  athleteId: string;
  data: ParentAccessData;
}) {
  const [state, formAction] = useActionState(
    inviteParent.bind(null, athleteId),
    {} as ParentActionState,
  );

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <form action={formAction} className="space-y-3">
          <div>
            <Label htmlFor={`parent-email-${athleteId}`}>Parent / guardian email</Label>
            <Input
              id={`parent-email-${athleteId}`}
              name="email"
              type="email"
              placeholder="parent@example.com"
              required
            />
          </div>
          {state.error ? (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-injury">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {state.error}
            </div>
          ) : null}
          {state.ok ? (
            <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-sm font-medium text-success">
              <Check className="h-4 w-4 shrink-0" />
              {state.message ?? "Invite sent."}
            </div>
          ) : null}
          <InviteSubmitButton />
        </form>
      </Card>

      {data.links.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-bold text-ink">Linked parents</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {data.links.map((link) => (
              <li
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{link.parent.name}</p>
                  <p className="truncate text-sm text-gray-500">{link.parent.email}</p>
                  <p className="text-xs text-gray-400">
                    Linked {formatDate(link.createdAt)}
                  </p>
                </div>
                <form action={revokeParentLink.bind(null, link.id, athleteId)}>
                  <Button type="submit" variant="outline" size="sm">
                    Revoke
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.pendingInvites.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-bold text-ink">Pending invites</h3>
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
            {data.pendingInvites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{invite.email}</p>
                  <p className="text-xs text-gray-400">
                    Sent {formatDate(invite.createdAt)} · Expires{" "}
                    {formatDate(invite.expiresAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <form action={resendParentInvite.bind(null, invite.id, athleteId)}>
                    <Button type="submit" variant="outline" size="sm">
                      Resend
                    </Button>
                  </form>
                  <form action={revokeParentInvite.bind(null, invite.id, athleteId)}>
                    <Button type="submit" variant="ghost" size="sm">
                      Cancel
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.links.length === 0 && data.pendingInvites.length === 0 ? (
        <p className="text-sm text-gray-500">
          No parents linked yet. Send an invite to give a parent read-only access to
          this training log and team schedule.
        </p>
      ) : null}
    </div>
  );
}

function InviteSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="md" disabled={pending}>
      {pending ? "Sending…" : "Send invite"}
    </Button>
  );
}

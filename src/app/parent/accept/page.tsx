import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { validateParentInviteToken } from "@/lib/parent-invite";
import { acceptParentInviteWhileLoggedIn } from "@/app/actions/parent";
import { AcceptForms } from "./accept-forms";
import {
  ParentInviteErrorLander,
  ParentInviteLander,
} from "@/components/parent/parent-invite-lander";
import { prisma } from "@/lib/prisma";

export default async function ParentAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await getCurrentUser();

  if (user && user.role === "PARENT" && token) {
    await acceptParentInviteWhileLoggedIn(token);
  }

  if (user && user.role !== "PARENT") {
    return (
      <ParentInviteErrorLander
        title="Wrong account"
        message="Log out of your current account before accepting this parent invite."
        hint={
          <>
            <Link href="/login" className="font-semibold text-brand hover:underline">
              Go to login
            </Link>{" "}
            to switch accounts.
          </>
        }
      />
    );
  }

  const record = token ? await validateParentInviteToken(token) : null;
  if (!token || !record) {
    return (
      <ParentInviteErrorLander
        title="Invite unavailable"
        message="This invite link is invalid or has expired."
        hint="Ask your athlete or coach to send a new invite from the Lovejoy XC Log app."
      />
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: record.email } });
  const mode =
    existing?.role === "PARENT" ? "login" : existing ? "blocked" : "signup";

  if (mode === "blocked") {
    return (
      <ParentInviteLander
        athlete={record.athlete}
        inviterName={record.invitedBy.name}
        inviteEmail={record.email}
        expiresAt={record.expiresAt}
        mode="signup"
      >
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-injury">
          <AlertCircle className="h-4 w-4 shrink-0" />
          This email is already registered with a different account type. Use a
          different email or contact your coach.
        </div>
      </ParentInviteLander>
    );
  }

  return (
    <ParentInviteLander
      athlete={record.athlete}
      inviterName={record.invitedBy.name}
      inviteEmail={record.email}
      expiresAt={record.expiresAt}
      mode={mode}
    >
      <AcceptForms token={token} email={record.email} mode={mode} />
    </ParentInviteLander>
  );
}

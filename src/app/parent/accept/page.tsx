import { AlertCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { validateParentInviteToken } from "@/lib/parent-invite";
import { acceptParentInviteWhileLoggedIn } from "@/app/actions/parent";
import { AcceptForms } from "./accept-forms";
import { Logo } from "@/components/logo";
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
      <AcceptShell error="Log out of your current account before accepting this invite." />
    );
  }

  const record = token ? await validateParentInviteToken(token) : null;
  if (!token || !record) {
    return (
      <AcceptShell error="This invite link is invalid or has expired." />
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: record.email } });
  const mode =
    existing?.role === "PARENT" ? "login" : existing ? "blocked" : "signup";

  return (
    <AcceptShell
      athleteName={record.athlete.name}
      inviterName={record.invitedBy.name}
      email={record.email}
    >
      {mode === "blocked" ? (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-injury">
          <AlertCircle className="h-4 w-4 shrink-0" />
          This email is already registered. Use a different email or contact your
          coach.
        </div>
      ) : (
        <AcceptForms token={token} email={record.email} mode={mode} />
      )}
    </AcceptShell>
  );
}

function AcceptShell({
  children,
  error,
  athleteName,
  inviterName,
  email,
}: {
  children?: React.ReactNode;
  error?: string;
  athleteName?: string;
  inviterName?: string;
  email?: string;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
            Lovejoy XC Log
          </h1>
          {athleteName ? (
            <p className="mt-1 text-sm text-gray-500">
              {inviterName} invited you to view {athleteName}&rsquo;s training log
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">Parent invite</p>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-injury">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : (
            children
          )}
          {email && !error ? (
            <p className="mt-4 text-center text-xs text-gray-400">
              Invite sent to {email}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

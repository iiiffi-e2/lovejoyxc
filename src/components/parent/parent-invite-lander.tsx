import {
  CalendarDays,
  ClipboardList,
  Footprints,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { GENDER_TEAM_LABEL, TEAM_GROUP_LABEL } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { GenderTeam, TeamGroup } from "@prisma/client";

export type ParentInviteAthlete = {
  name: string;
  avatarUrl: string | null;
  grade: number | null;
  genderTeam: GenderTeam | null;
  teamGroup: TeamGroup | null;
  team: { name: string; season: string } | null;
};

const ACCESS_ITEMS = [
  { icon: ClipboardList, label: "Workout history and training log" },
  { icon: CalendarDays, label: "Team schedule (practices and meets)" },
  { icon: Footprints, label: "Shoe mileage tracking" },
] as const;

export function ParentInviteLander({
  athlete,
  inviterName,
  inviteEmail,
  expiresAt,
  mode,
  children,
}: {
  athlete: ParentInviteAthlete;
  inviterName: string;
  inviteEmail: string;
  expiresAt: Date;
  mode: "signup" | "login";
  children: React.ReactNode;
}) {
  const firstName = athlete.name.split(" ")[0];

  return (
    <main className="flex min-h-dvh flex-col bg-surface px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-brand">
            Parent / guardian invite
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
            Lovejoy XC Log
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Private running log for the Lovejoy Leopards
          </p>
        </header>

        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
          <div className="border-b border-line bg-brand-light/40 px-6 py-5 text-center">
            <UserAvatar
              name={athlete.name}
              avatarUrl={athlete.avatarUrl}
              size="lg"
              className="mx-auto h-20 w-20 text-2xl"
            />
            <h2 className="mt-4 text-xl font-extrabold text-ink">{athlete.name}</h2>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {athlete.grade ? (
                <Badge tone="ink">Grade {athlete.grade}</Badge>
              ) : null}
              {athlete.teamGroup ? (
                <Badge tone="brand">{TEAM_GROUP_LABEL[athlete.teamGroup]}</Badge>
              ) : null}
              {athlete.genderTeam ? (
                <Badge tone="neutral">{GENDER_TEAM_LABEL[athlete.genderTeam]}</Badge>
              ) : null}
            </div>
            {athlete.team ? (
              <p className="mt-3 text-sm text-gray-500">
                {athlete.team.name} · {athlete.team.season}
              </p>
            ) : null}
          </div>

          <div className="space-y-5 px-6 py-5">
            <div>
              <p className="text-base font-semibold text-ink">
                You&rsquo;re invited to view {firstName}&rsquo;s training log
              </p>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {inviterName} invited you to follow {firstName}&rsquo;s cross
                country training on Lovejoy XC Log. You&rsquo;ll get read-only
                access — you can see their progress but cannot log runs or edit
                anything on their behalf.
              </p>
            </div>

            <ul className="space-y-2.5">
              {ACCESS_ITEMS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-start gap-3 text-sm text-gray-600">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-brand">
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-ink">
            {mode === "signup" ? "Create your parent account" : "Sign in to accept"}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {mode === "signup"
              ? "Set a password to finish accepting this invite."
              : "You already have a parent account for this email. Sign in to link this athlete."}
          </p>
          <div className="mt-5">{children}</div>
          <p className="mt-4 text-center text-xs text-gray-400">
            Invite sent to {inviteEmail} · Expires {formatDate(expiresAt)}
          </p>
        </div>
      </div>
    </main>
  );
}

export function ParentInviteErrorLander({
  title,
  message,
  hint,
}: {
  title: string;
  message: string;
  hint?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-5 py-10">
      <div className="w-full max-w-md text-center">
        <Logo size="lg" className="mx-auto" />
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-brand">
          Parent / guardian invite
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink">
          {title}
        </h1>
        <div className="mt-6 rounded-2xl border border-line bg-white p-6 text-left shadow-sm">
          <p className="text-sm font-medium text-injury">{message}</p>
          {hint ? <div className="mt-4 text-sm text-gray-500">{hint}</div> : null}
        </div>
      </div>
    </main>
  );
}

import { Activity, Gauge, Route, Trophy } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeading, SectionTitle } from "@/components/section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { UserAvatar } from "@/components/user-avatar";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { formatMiles, formatPace } from "@/lib/format";
import {
  GENDER_TEAM_LABEL,
  RUNNING_TYPES,
  TEAM_GROUP_LABEL,
} from "@/lib/labels";

export default async function ProfilePage() {
  const user = await requireRole("ATHLETE");

  const [logs, team] = await Promise.all([
    prisma.workoutLog.findMany({
      where: { athleteId: user.id },
      select: { distance: true, paceSec: true, workoutType: true },
    }),
    user.teamId
      ? prisma.team.findUnique({ where: { id: user.teamId } })
      : Promise.resolve(null),
  ]);

  const runs = logs.filter((l) => RUNNING_TYPES.includes(l.workoutType));
  const totalMiles = runs.reduce((s, l) => s + l.distance, 0);
  const longest = runs.reduce((m, l) => Math.max(m, l.distance), 0);
  const paces = runs.map((l) => l.paceSec).filter((p): p is number => !!p);
  const avgPace = paces.length
    ? Math.round(paces.reduce((a, b) => a + b, 0) / paces.length)
    : null;

  const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeading title="Profile" />

      <Card className="p-5">
        <div className="flex items-center gap-4">
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-ink">{user.name}</h2>
            <p className="truncate text-sm text-gray-500">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {user.grade ? <Badge tone="ink">Grade {user.grade}</Badge> : null}
              {user.teamGroup ? (
                <Badge tone="brand">{TEAM_GROUP_LABEL[user.teamGroup]}</Badge>
              ) : null}
              {user.genderTeam ? (
                <Badge tone="neutral">
                  {GENDER_TEAM_LABEL[user.genderTeam]}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>
        {team ? (
          <p className="mt-4 border-t border-line pt-3 text-sm text-gray-500">
            {team.name} · {team.season} {team.schoolYear}
          </p>
        ) : null}
        <AvatarUpload
          avatarUrl={user.avatarUrl}
          blobConfigured={blobConfigured}
        />
      </Card>

      <div>
        <SectionTitle title="Season totals" />
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total miles"
            value={formatMiles(totalMiles)}
            unit="mi"
            icon={Route}
          />
          <StatCard
            label="Total runs"
            value={runs.length}
            tone="ink"
            icon={Activity}
          />
          <StatCard
            label="Longest run"
            value={formatMiles(longest)}
            unit="mi"
            tone="ink"
            icon={Trophy}
          />
          <StatCard
            label="Avg pace"
            value={avgPace ? formatPace(avgPace).replace("/mi", "") : "—"}
            unit={avgPace ? "/mi" : ""}
            tone="brand"
            icon={Gauge}
          />
        </div>
      </div>

      <Card className="p-5">
        <p className="text-sm text-gray-500">
          Need to update your grade, team group, or other details? Reach out to
          your coach — they keep the roster up to date.
        </p>
      </Card>
    </div>
  );
}

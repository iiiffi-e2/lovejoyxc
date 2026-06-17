import { Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getTeamAthletes, getTeamLogs } from "@/lib/queries";
import { PageHeading } from "@/components/section";
import { LogList } from "@/components/log-row";
import { EmptyState } from "@/components/empty-state";
import { Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { WORKOUT_TYPE_LABEL, enumOptions } from "@/lib/labels";
import { addDays, startOfMonth, startOfWeek } from "@/lib/dates";

const PERIODS: Record<string, string> = {
  week: "This week",
  month: "This month",
  "30d": "Last 30 days",
  all: "All time",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ athlete?: string; type?: string; period?: string }>;
}) {
  const user = await requireRole("ATHLETE");
  const sp = await searchParams;

  if (!user.teamId) {
    return (
      <div className="animate-fade-in">
        <PageHeading
          title="Team"
          description="See what your teammates are logging."
        />
        <EmptyState
          icon={Users}
          title="No team yet"
          description="Once you're on a team, you'll see your teammates' workout logs here."
        />
      </div>
    );
  }

  const athleteId = sp.athlete ?? "";
  const type = sp.type ?? "";
  const period = sp.period ?? "week";
  const now = new Date();

  let from: Date | undefined;
  if (period === "week") from = startOfWeek(now);
  else if (period === "month") from = startOfMonth(now);
  else if (period === "30d") from = addDays(now, -30);

  const [teammates, logs] = await Promise.all([
    getTeamAthletes(user.teamId),
    getTeamLogs(user.teamId, {
      athleteId: athleteId || undefined,
      workoutType: type || undefined,
      from,
    }),
  ]);

  return (
    <div className="animate-fade-in">
      <PageHeading
        title="Team"
        description={
          logs.length > 0
            ? `${logs.length} recent logs from ${teammates.length} teammates`
            : "See what your teammates are logging."
        }
      />

      <form className="mb-5 grid grid-cols-2 gap-3" method="get">
        <Select name="athlete" defaultValue={athleteId} aria-label="Teammate">
          <option value="">All teammates</option>
          {teammates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.id === user.id ? " (you)" : ""}
            </option>
          ))}
        </Select>
        <Select name="type" defaultValue={type} aria-label="Workout type">
          <option value="">All workouts</option>
          {enumOptions(WORKOUT_TYPE_LABEL).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        <Select
          name="period"
          defaultValue={period}
          aria-label="Period"
          className="col-span-2 sm:col-span-1"
        >
          {Object.entries(PERIODS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="outline" size="md" className="col-span-2">
          Apply filters
        </Button>
      </form>

      {logs.length > 0 ? (
        <LogList
          logs={logs}
          showAthlete
          hrefForLog={(l) =>
            l.athlete?.id === user.id ? `/log/${l.id}` : undefined
          }
        />
      ) : (
        <EmptyState
          icon={Users}
          title="No team logs yet"
          description="When teammates log their runs, they'll show up here. Be the first to log today!"
        />
      )}
    </div>
  );
}

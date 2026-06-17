import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CalendarDays,
  CalendarRange,
  ClipboardList,
  Flame,
  Footprints,
  TrendingUp,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import {
  getAthleteForParent,
  parentPath,
  resolveParentChildId,
} from "@/lib/parent-access";
import { getAthleteDashboard, getThisWeekSchedule } from "@/lib/queries";
import { ScheduleEventCard } from "@/components/schedule/schedule-event-card";
import { ChildHeader } from "@/components/parent/child-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { SectionTitle } from "@/components/section";
import { LogList } from "@/components/log-row";
import { EmptyState } from "@/components/empty-state";
import { MileageBarChart } from "@/components/charts/mileage-bar-chart";
import { AlertCard } from "@/components/alert-card";
import { WorkoutTypeBadge } from "@/components/domain-badges";
import { formatMiles, formatPace, formatPercent, relativeDays } from "@/lib/format";
import { changePercent } from "@/lib/metrics";
import { RUNNING_TYPES } from "@/lib/labels";

export default async function ParentDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const user = await requireRole("PARENT");
  const sp = await searchParams;
  const childId = await resolveParentChildId(user.id, sp.child);
  if (!childId) redirect("/parent/profile");

  const athlete = await getAthleteForParent(childId);
  if (!athlete) redirect("/parent/profile");

  const data = await getAthleteDashboard(childId);
  const weekEvents = athlete.teamId
    ? await getThisWeekSchedule(athlete.teamId)
    : [];
  const change = changePercent(data.thisWeekMiles, data.lastWeekMiles);

  return (
    <div className="space-y-6 animate-fade-in">
      <ChildHeader athlete={athlete} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          label="This week"
          value={formatMiles(data.thisWeekMiles)}
          unit="mi"
          icon={TrendingUp}
          hint={
            change != null ? (
              <span className={change >= 0 ? "text-success" : "text-gray-500"}>
                {formatPercent(change)} vs last week
              </span>
            ) : (
              "Keep it rolling"
            )
          }
        />
        <StatCard
          label="Last week"
          value={formatMiles(data.lastWeekMiles)}
          unit="mi"
          tone="ink"
          icon={CalendarRange}
        />
        <StatCard
          label="This month"
          value={formatMiles(data.monthMiles)}
          unit="mi"
          tone="ink"
          icon={CalendarDays}
        />
        <StatCard
          label="Logging streak"
          value={data.streak}
          unit={data.streak === 1 ? "day" : "days"}
          tone="brand"
          icon={Flame}
          hint={data.streak > 0 ? "Stay consistent" : "No streak yet"}
        />
      </div>

      <div>
        <SectionTitle
          title="This week"
          action={{
            label: "Full schedule",
            href: parentPath("/parent/schedule", childId),
          }}
        />
        {weekEvents.length > 0 ? (
          <ul className="space-y-3">
            {weekEvents.map((event) => (
              <li key={event.id}>
                <ScheduleEventCard event={event} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No events this week"
            description="Check the full schedule for upcoming practices and meets."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href={parentPath("/parent/schedule", childId)}>
                  View schedule
                </Link>
              </Button>
            }
          />
        )}
      </div>

      {data.shoeAlerts.length > 0 ? (
        <AlertCard
          icon={Footprints}
          tone="warning"
          title="Shoe mileage warning"
          action={
            <Button asChild variant="outline" size="sm">
              <Link href={parentPath("/parent/shoes", childId)}>View</Link>
            </Button>
          }
        >
          {data.shoeAlerts.map((s) => s.name).join(", ")} approaching the mileage
          limit.
        </AlertCard>
      ) : null}

      <div>
        <SectionTitle title="Weekly mileage" />
        <Card>
          <CardContent>
            <MileageBarChart data={data.weekly} />
          </CardContent>
        </Card>
      </div>

      <div>
        <SectionTitle title="Last workout" />
        {data.lastWorkout ? (
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <WorkoutTypeBadge type={data.lastWorkout.workoutType} />
                <p className="mt-2 text-sm text-gray-500">
                  {relativeDays(data.lastWorkout.date)}
                  {data.lastWorkout.shoe ? ` · ${data.lastWorkout.shoe.name}` : ""}
                </p>
              </div>
              {RUNNING_TYPES.includes(data.lastWorkout.workoutType) ? (
                <div className="text-right">
                  <p className="text-2xl font-extrabold text-ink">
                    {formatMiles(data.lastWorkout.distance)}
                    <span className="ml-1 text-sm text-gray-400">mi</span>
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatPace(data.lastWorkout.paceSec)}
                  </p>
                </div>
              ) : null}
            </div>
          </Card>
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="No workouts yet"
            description="Workouts will appear here once logged."
          />
        )}
      </div>

      <div>
        <SectionTitle
          title="Recent logs"
          action={{
            label: "See all",
            href: parentPath("/parent/history", childId),
          }}
        />
        {data.recentLogs.length > 0 ? (
          <LogList logs={data.recentLogs} />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Nothing logged yet"
            description="Recent runs will show up here."
          />
        )}
      </div>
    </div>
  );
}

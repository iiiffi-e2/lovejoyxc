import Link from "next/link";
import {
  CalendarPlus,
  Flame,
  Footprints,
  TrendingUp,
  CalendarRange,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getAthleteDashboard } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { SectionTitle } from "@/components/section";
import { LogList } from "@/components/log-row";
import { ShoeCard } from "@/components/shoe-card";
import { EmptyState } from "@/components/empty-state";
import { MileageBarChart } from "@/components/charts/mileage-bar-chart";
import { AlertCard } from "@/components/alert-card";
import { WorkoutTypeBadge } from "@/components/domain-badges";
import { formatMiles, formatPace, formatPercent, relativeDays } from "@/lib/format";
import { changePercent } from "@/lib/metrics";
import { RUNNING_TYPES } from "@/lib/labels";

export default async function AthleteDashboard() {
  const user = await requireRole("ATHLETE");
  const data = await getAthleteDashboard(user.id);
  const change = changePercent(data.thisWeekMiles, data.lastWeekMiles);

  return (
    <div className="space-y-6 animate-fade-in">
      <Button asChild size="lg" className="w-full text-base">
        <Link href="/log">
          <CalendarPlus className="h-5 w-5" />
          Log Today&rsquo;s Run
        </Link>
      </Button>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatCard
          label="This week"
          value={formatMiles(data.thisWeekMiles)}
          unit="mi"
          icon={TrendingUp}
          hint={
            change != null ? (
              <span
                className={
                  change >= 0 ? "text-success" : "text-gray-500"
                }
              >
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
          hint={data.streak > 0 ? "Stay consistent" : "Log today to start"}
        />
      </div>

      {data.shoeAlerts.length > 0 ? (
        <AlertCard
          icon={Footprints}
          tone="warning"
          title="Shoe mileage warning"
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/shoes">View</Link>
            </Button>
          }
        >
          {data.shoeAlerts.map((s) => s.name).join(", ")} need a check —
          approaching the mileage limit.
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
            description="Log your first run to see your training come to life."
          />
        )}
      </div>

      {data.shoes.length > 0 ? (
        <div>
          <SectionTitle title="Your shoes" action={{ label: "Manage", href: "/shoes" }} />
          <div className="grid gap-3 sm:grid-cols-2">
            {data.shoes.slice(0, 2).map((shoe) => (
              <ShoeCard key={shoe.id} shoe={shoe} />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <SectionTitle title="Your shoes" />
          <EmptyState
            icon={Footprints}
            title="No shoes yet"
            description="Add your running shoes to track mileage and know when it's time for a new pair."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/shoes">Add shoes</Link>
              </Button>
            }
          />
        </div>
      )}

      <div>
        <SectionTitle title="Recent logs" action={{ label: "See all", href: "/history" }} />
        {data.recentLogs.length > 0 ? (
          <LogList
            logs={data.recentLogs}
            hrefForLog={(l) => `/log/${l.id}`}
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Nothing logged yet"
            description="Your recent runs will show up here."
          />
        )}
      </div>
    </div>
  );
}

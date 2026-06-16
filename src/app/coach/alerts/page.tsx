import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  BellOff,
  Footprints,
  HeartPulse,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getCoachDashboard, getFlaggedLogs } from "@/lib/queries";
import { PageHeading, SectionTitle } from "@/components/section";
import { AlertCard } from "@/components/alert-card";
import { EmptyState } from "@/components/empty-state";
import { LogList } from "@/components/log-row";
import { Button } from "@/components/ui/button";
import { formatMiles, formatPercent, relativeDays } from "@/lib/format";

export default async function AlertsPage() {
  await requireRole("COACH", "ADMIN");
  const [data, flagged] = await Promise.all([
    getCoachDashboard(),
    getFlaggedLogs(),
  ]);

  const hasAlerts =
    data.missing.length > 0 ||
    data.injuries.length > 0 ||
    data.spikes.length > 0 ||
    data.shoeWarnings.length > 0;

  return (
    <div className="space-y-7 animate-fade-in">
      <PageHeading
        title="Alerts"
        description="Things worth a quick check-in with your athletes."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {data.missing.length > 0 ? (
          <AlertCard
            icon={Users}
            tone="warning"
            title={`${data.missing.length} ${
              data.missing.length === 1 ? "athlete has" : "athletes have"
            } not logged in 2+ days.`}
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/coach/athletes">View</Link>
              </Button>
            }
          >
            {data.missing
              .map((m) => `${m.athlete.name} (${relativeDays(m.lastLogged).toLowerCase()})`)
              .join(", ")}
          </AlertCard>
        ) : null}

        {data.injuries.length > 0 ? (
          <AlertCard
            icon={HeartPulse}
            tone="injury"
            title={`${data.injuries.length} ${
              data.injuries.length === 1 ? "athlete" : "athletes"
            } reported pain this week.`}
          >
            {data.injuries.map((m) => m.athlete.name).join(", ")}
          </AlertCard>
        ) : null}

        {data.spikes.length > 0 ? (
          <AlertCard
            icon={Activity}
            tone="warning"
            title={`${data.spikes.length} ${
              data.spikes.length === 1 ? "athlete" : "athletes"
            } increased mileage 30%+ from last week.`}
          >
            {data.spikes
              .map(
                (m) =>
                  `${m.athlete.name} (${
                    m.change != null ? formatPercent(m.change) : ""
                  })`,
              )
              .join(", ")}
          </AlertCard>
        ) : null}

        {data.shoeWarnings.length > 0 ? (
          <AlertCard
            icon={Footprints}
            tone="warning"
            title={`${data.shoeWarnings.length} ${
              data.shoeWarnings.length === 1 ? "pair" : "pairs"
            } of shoes near the mileage limit.`}
          >
            {data.shoeWarnings
              .map(
                (s) =>
                  `${s.athlete.name} — ${s.name} (${formatMiles(s.totalMiles)} mi)`,
              )
              .join(", ")}
          </AlertCard>
        ) : null}
      </div>

      {!hasAlerts ? (
        <AlertCard icon={BellOff} tone="brand" title="No active alerts">
          Everyone is logging, healthy, and ramping safely. Great team week.
        </AlertCard>
      ) : null}

      <div>
        <SectionTitle title="Low-mood & high-effort logs (7 days)" />
        {flagged.length > 0 ? (
          <LogList logs={flagged} showAthlete />
        ) : (
          <EmptyState
            icon={AlertTriangle}
            title="Nothing flagged"
            description="No rough, painful, or all-out efforts logged recently."
          />
        )}
      </div>
    </div>
  );
}

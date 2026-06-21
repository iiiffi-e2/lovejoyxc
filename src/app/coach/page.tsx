import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  CalendarCheck,
  Footprints,
  Gauge,
  HeartPulse,
  TrendingUp,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getCoachDashboard } from "@/lib/queries";
import { PageHeading, SectionTitle } from "@/components/section";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCard } from "@/components/alert-card";
import { MileageBarChart } from "@/components/charts/mileage-bar-chart";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { FeelingChip } from "@/components/domain-badges";
import { EmptyState } from "@/components/empty-state";
import { formatMiles, formatPercent, relativeDays } from "@/lib/format";
import { scoreToFeeling } from "@/lib/labels";

export default async function CoachDashboard() {
  await requireRole("COACH", "ADMIN");
  const data = await getCoachDashboard();

  return (
    <div className="space-y-7 animate-fade-in">
      <PageHeading
        title="Athletes & logs"
        description="Who's logging, how they're training, and what needs attention."
      />

      <CoachAlerts data={data} />

      <div>
        <SectionTitle
          title="Athlete log status"
          action={{ label: "All athletes", href: "/coach/athletes" }}
        />
        {data.rows.length > 0 ? (
          <TableWrap>
            <Table>
              <thead>
                <Tr className="border-t-0">
                  <Th>Athlete</Th>
                  <Th>Last logged</Th>
                  <Th className="text-right">This wk</Th>
                  <Th className="text-right">Last wk</Th>
                  <Th className="text-right">Change</Th>
                  <Th>Feeling</Th>
                  <Th>Injury</Th>
                  <Th>Status</Th>
                </Tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <Tr key={r.athlete.id} className="hover:bg-surface">
                    <Td className="font-semibold text-ink">
                      <Link
                        href={`/coach/athletes/${r.athlete.id}`}
                        className="hover:text-brand"
                      >
                        {r.athlete.name}
                      </Link>
                    </Td>
                    <Td className="text-gray-500">{relativeDays(r.lastLogged)}</Td>
                    <Td className="text-right font-semibold text-ink">
                      {formatMiles(r.thisWeekMiles)}
                    </Td>
                    <Td className="text-right text-gray-500">
                      {formatMiles(r.lastWeekMiles)}
                    </Td>
                    <Td className="text-right">
                      {r.change != null ? (
                        <span
                          className={
                            r.change >= 30
                              ? "font-semibold text-warning"
                              : r.change >= 0
                                ? "text-success"
                                : "text-gray-500"
                          }
                        >
                          {formatPercent(r.change)}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </Td>
                    <Td>
                      <FeelingChip
                        feeling={scoreToFeeling(r.feeling)}
                        withLabel={false}
                      />
                    </Td>
                    <Td>
                      {r.painFlag ? (
                        <Badge tone="injury">
                          <AlertTriangle className="h-3 w-3" /> Pain
                        </Badge>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={r.status.tone}>{r.status.label}</Badge>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        ) : (
          <EmptyState
            icon={Users}
            title="No athletes yet"
            description="Ask your admin to add athletes to the roster."
          />
        )}
      </div>

      <div className="space-y-6">
        <SectionTitle title="Team snapshot" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            label="Team miles · this week"
            value={formatMiles(data.teamMilesThisWeek)}
            unit="mi"
            icon={TrendingUp}
          />
          <StatCard
            label="Logged today"
            value={`${data.loggedToday}/${data.athleteCount}`}
            tone="ink"
            icon={CalendarCheck}
          />
          <StatCard
            label="Missing logs"
            value={data.missing.length}
            tone={data.missing.length > 0 ? "warning" : "ink"}
            icon={Users}
          />
          <StatCard
            label="Injury / pain flags"
            value={data.injuries.length}
            tone={data.injuries.length > 0 ? "injury" : "ink"}
            icon={HeartPulse}
          />
          <StatCard
            label="Avg weekly mileage"
            value={formatMiles(data.avgWeekly)}
            unit="mi"
            tone="ink"
            icon={Gauge}
          />
          <StatCard
            label="Mileage spikes"
            value={data.spikes.length}
            tone={data.spikes.length > 0 ? "warning" : "ink"}
            icon={Activity}
          />
          <StatCard
            label="Shoe warnings"
            value={data.shoeWarnings.length}
            tone={data.shoeWarnings.length > 0 ? "warning" : "ink"}
            icon={Footprints}
          />
          <StatCard
            label="Active athletes"
            value={data.athleteCount}
            tone="brand"
            icon={Users}
          />
        </div>

        <div>
          <SectionTitle title="Team mileage (8 weeks)" />
          <Card>
            <CardContent>
              <MileageBarChart data={data.trend} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function CoachAlerts({
  data,
}: {
  data: Awaited<ReturnType<typeof getCoachDashboard>>;
}) {
  const alerts: React.ReactNode[] = [];

  if (data.missing.length > 0) {
    alerts.push(
      <AlertCard
        key="missing"
        icon={Users}
        tone="warning"
        title={`${data.missing.length} ${
          data.missing.length === 1 ? "athlete has" : "athletes have"
        } not logged in 2+ days.`}
      >
        {data.missing.map((m) => m.athlete.name).join(", ")} — needs check-in.
      </AlertCard>,
    );
  }
  if (data.injuries.length > 0) {
    alerts.push(
      <AlertCard
        key="injury"
        icon={HeartPulse}
        tone="injury"
        title={`${data.injuries.length} ${
          data.injuries.length === 1 ? "athlete" : "athletes"
        } reported pain this week.`}
      >
        {data.injuries.map((m) => m.athlete.name).join(", ")}.
      </AlertCard>,
    );
  }
  if (data.spikes.length > 0) {
    alerts.push(
      <AlertCard
        key="spike"
        icon={Activity}
        tone="warning"
        title={`${data.spikes.length} ${
          data.spikes.length === 1 ? "athlete" : "athletes"
        } increased mileage more than 30% from last week.`}
      >
        {data.spikes.map((m) => m.athlete.name).join(", ")}.
      </AlertCard>,
    );
  }
  if (data.shoeWarnings.length > 0) {
    alerts.push(
      <AlertCard
        key="shoes"
        icon={Footprints}
        tone="warning"
        title={`${data.shoeWarnings.length} ${
          data.shoeWarnings.length === 1 ? "pair of shoes is" : "pairs of shoes are"
        } near the mileage limit.`}
      >
        {data.shoeWarnings
          .map((s) => `${s.athlete.name} (${s.name})`)
          .join(", ")}
        .
      </AlertCard>,
    );
  }

  if (alerts.length === 0) {
    return (
      <AlertCard icon={CalendarCheck} tone="brand" title="Everything looks great.">
        No missing logs, injuries, or mileage spikes right now. Nice work, team.
      </AlertCard>
    );
  }

  return <div className="flex flex-col gap-3">{alerts}</div>;
}

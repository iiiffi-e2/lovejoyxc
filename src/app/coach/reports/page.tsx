import Link from "next/link";
import { Activity, BarChart3 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getWeeklyMileageByAthlete, type CoachFilters } from "@/lib/queries";
import { PageHeading, SectionTitle } from "@/components/section";
import { CoachFilterBar } from "@/components/coach-filter-bar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MileageBarChart } from "@/components/charts/mileage-bar-chart";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { AlertCard } from "@/components/alert-card";
import { formatMiles, formatPercent } from "@/lib/format";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireRole("COACH", "ADMIN");
  const sp = await searchParams;

  const filters: CoachFilters = {
    grade: sp.grade ? Number(sp.grade) : undefined,
    teamGroup: sp.teamGroup || undefined,
    genderTeam: sp.genderTeam || undefined,
  };

  const { labels, rows, teamWeekly } = await getWeeklyMileageByAthlete(6, filters);
  const trend = labels.map((label, i) => ({
    label,
    miles: teamWeekly[i],
    highlight: i === labels.length - 1,
  }));
  const spikes = rows.filter((r) => r.spike);

  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(sp).filter(([, v]) => v)),
  ).toString();

  return (
    <div className="space-y-7 animate-fade-in">
      <PageHeading
        title="Reports"
        description="Weekly mileage by athlete, team trends, and spike alerts."
      />

      <CoachFilterBar
        action="/coach/reports"
        fields={["grade", "teamGroup", "genderTeam"]}
        values={sp}
        exportHref={`/coach/logs/export${qs ? `?${qs}` : ""}`}
      />

      <div>
        <SectionTitle title="Team mileage trend (6 weeks)" />
        <Card>
          <CardContent>
            <MileageBarChart data={trend} />
          </CardContent>
        </Card>
      </div>

      {spikes.length > 0 ? (
        <AlertCard
          icon={Activity}
          tone="warning"
          title={`${spikes.length} mileage ${spikes.length === 1 ? "spike" : "spikes"} detected`}
        >
          {spikes.map((s) => s.athlete.name).join(", ")} jumped 30%+ from last
          week — keep an eye on load.
        </AlertCard>
      ) : null}

      <div>
        <SectionTitle title="Weekly mileage by athlete" />
        {rows.length > 0 ? (
          <TableWrap>
            <Table>
              <thead>
                <Tr className="border-t-0">
                  <Th>Athlete</Th>
                  {labels.map((l) => (
                    <Th key={l} className="text-right">
                      {l}
                    </Th>
                  ))}
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Change</Th>
                </Tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <Tr key={r.athlete.id} className="hover:bg-surface">
                    <Td className="font-semibold text-ink whitespace-nowrap">
                      <Link
                        href={`/coach/athletes/${r.athlete.id}`}
                        className="hover:text-brand"
                      >
                        {r.athlete.name}
                      </Link>
                    </Td>
                    {r.weekly.map((m, i) => (
                      <Td
                        key={i}
                        className={`text-right ${
                          i === r.weekly.length - 1
                            ? "font-semibold text-ink"
                            : "text-gray-500"
                        }`}
                      >
                        {m > 0 ? formatMiles(m) : "—"}
                      </Td>
                    ))}
                    <Td className="text-right font-bold text-ink">
                      {formatMiles(r.total)}
                    </Td>
                    <Td className="text-right">
                      {r.change != null ? (
                        <Badge tone={r.spike ? "warning" : "neutral"}>
                          {formatPercent(r.change)}
                        </Badge>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        ) : (
          <EmptyState icon={BarChart3} title="No data to report yet" />
        )}
      </div>
    </div>
  );
}

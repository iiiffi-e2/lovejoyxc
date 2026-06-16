import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getCoachAthletes, getCoachLogs, type CoachFilters } from "@/lib/queries";
import { PageHeading } from "@/components/section";
import { CoachFilterBar } from "@/components/coach-filter-bar";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { FeelingChip, SorenessBadge, WorkoutTypeBadge } from "@/components/domain-badges";
import { EmptyState } from "@/components/empty-state";
import { formatDate, formatMiles, formatPace } from "@/lib/format";
import { dateInputToUTC } from "@/lib/format";

export default async function CoachLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireRole("COACH", "ADMIN");
  const sp = await searchParams;

  const filters: CoachFilters = {
    athleteId: sp.athleteId || undefined,
    workoutType: sp.workoutType || undefined,
    from: sp.from ? dateInputToUTC(sp.from) : undefined,
    to: sp.to ? dateInputToUTC(sp.to) : undefined,
  };

  const [athletes, logs] = await Promise.all([
    getCoachAthletes(),
    getCoachLogs(filters),
  ]);

  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(sp).filter(([, v]) => v)),
  ).toString();

  return (
    <div className="animate-fade-in">
      <PageHeading
        title="Logs"
        description={`${logs.length} workout ${logs.length === 1 ? "log" : "logs"}`}
      />

      <CoachFilterBar
        action="/coach/logs"
        fields={["athlete", "workoutType", "from", "to"]}
        values={sp}
        athletes={athletes}
        exportHref={`/coach/logs/export${qs ? `?${qs}` : ""}`}
      />

      {logs.length > 0 ? (
        <TableWrap>
          <Table>
            <thead>
              <Tr className="border-t-0">
                <Th>Date</Th>
                <Th>Athlete</Th>
                <Th>Type</Th>
                <Th className="text-right">Distance</Th>
                <Th className="text-right">Pace</Th>
                <Th className="text-right">Effort</Th>
                <Th>Feeling</Th>
                <Th>Soreness</Th>
                <Th>Notes</Th>
              </Tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <Tr key={l.id} className="hover:bg-surface">
                  <Td className="whitespace-nowrap text-gray-500">
                    {formatDate(l.date)}
                  </Td>
                  <Td className="font-semibold text-ink">
                    <Link
                      href={`/coach/athletes/${l.athlete.id}`}
                      className="hover:text-brand"
                    >
                      {l.athlete.name}
                    </Link>
                  </Td>
                  <Td>
                    <WorkoutTypeBadge type={l.workoutType} />
                  </Td>
                  <Td className="text-right font-semibold text-ink">
                    {l.distance > 0 ? `${formatMiles(l.distance)} mi` : "—"}
                  </Td>
                  <Td className="text-right text-gray-500">
                    {formatPace(l.paceSec)}
                  </Td>
                  <Td className="text-right text-gray-500">
                    {l.effort ? `${l.effort}/10` : "—"}
                  </Td>
                  <Td>
                    <FeelingChip feeling={l.feeling} withLabel={false} />
                  </Td>
                  <Td>
                    <SorenessBadge soreness={l.soreness} />
                  </Td>
                  <Td className="max-w-[240px] truncate text-gray-500">
                    {l.notes ?? "—"}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      ) : (
        <EmptyState
          icon={ClipboardList}
          title="No logs found"
          description="Adjust the filters to see workout logs."
        />
      )}
    </div>
  );
}

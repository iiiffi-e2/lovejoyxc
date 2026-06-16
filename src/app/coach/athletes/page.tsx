import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getTeamStatusRows, type CoachFilters } from "@/lib/queries";
import { PageHeading } from "@/components/section";
import { CoachFilterBar } from "@/components/coach-filter-bar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FeelingChip } from "@/components/domain-badges";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { formatMiles, relativeDays } from "@/lib/format";
import { scoreToFeeling, TEAM_GROUP_LABEL, GENDER_TEAM_LABEL } from "@/lib/labels";

export default async function CoachAthletesPage({
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
  const rows = await getTeamStatusRows(filters);

  return (
    <div className="animate-fade-in">
      <PageHeading
        title="Athletes"
        description={`${rows.length} active ${rows.length === 1 ? "athlete" : "athletes"}`}
      />

      <CoachFilterBar
        action="/coach/athletes"
        fields={["grade", "teamGroup", "genderTeam"]}
        values={sp}
      />

      {rows.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => (
            <Link key={r.athlete.id} href={`/coach/athletes/${r.athlete.id}`}>
              <Card className="p-4 transition-all hover:border-brand/30 hover:shadow-md">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={r.athlete.name}
                      avatarUrl={r.athlete.avatarUrl}
                      size="md"
                    />
                    <div>
                      <p className="font-bold text-ink">{r.athlete.name}</p>
                      <p className="text-xs text-gray-400">
                        {r.athlete.grade ? `Grade ${r.athlete.grade}` : "—"}
                        {r.athlete.teamGroup
                          ? ` · ${TEAM_GROUP_LABEL[r.athlete.teamGroup]}`
                          : ""}
                        {r.athlete.genderTeam
                          ? ` · ${GENDER_TEAM_LABEL[r.athlete.genderTeam]}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                  <div>
                    <p className="text-lg font-extrabold text-ink">
                      {formatMiles(r.thisWeekMiles)}
                      <span className="ml-1 text-xs font-semibold text-gray-400">
                        mi this wk
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      Last logged {relativeDays(r.lastLogged).toLowerCase()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge tone={r.status.tone}>{r.status.label}</Badge>
                    <FeelingChip
                      feeling={scoreToFeeling(r.feeling)}
                      withLabel={false}
                    />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Users}
          title="No athletes match"
          description="Try clearing the filters above."
        />
      )}
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, HeartPulse } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getAthleteProfileForCoach } from "@/lib/queries";
import { SectionTitle } from "@/components/section";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/stat-card";
import { LogList } from "@/components/log-row";
import { ShoeCard } from "@/components/shoe-card";
import { MileageBarChart } from "@/components/charts/mileage-bar-chart";
import { TrendLineChart } from "@/components/charts/trend-line-chart";
import { EmptyState } from "@/components/empty-state";
import { UserAvatar } from "@/components/user-avatar";
import { AthleteEmailEdit } from "@/components/coach/athlete-email-edit";
import { CoachNotes } from "./coach-notes";
import { FeelingChip } from "@/components/domain-badges";
import { formatMiles, formatDate, formatPercent } from "@/lib/format";
import { changePercent } from "@/lib/metrics";
import {
  GENDER_TEAM_LABEL,
  SORENESS_LABEL,
  TEAM_GROUP_LABEL,
} from "@/lib/labels";

export default async function AthleteProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("COACH", "ADMIN");
  const { id } = await params;
  const data = await getAthleteProfileForCoach(id);
  if (!data) notFound();

  const { athlete } = data;
  const change = changePercent(data.thisWeekMiles, data.lastWeekMiles);

  return (
    <div className="space-y-7 animate-fade-in">
      <Link
        href="/coach/athletes"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to athletes
      </Link>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <UserAvatar
              name={athlete.name}
              avatarUrl={athlete.avatarUrl}
              size="lg"
              className="h-14 w-14 text-lg"
            />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-ink">
                {athlete.name}
              </h1>
              <AthleteEmailEdit athleteId={athlete.id} email={athlete.email} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {athlete.grade ? (
                  <Badge tone="ink">Grade {athlete.grade}</Badge>
                ) : null}
                {athlete.teamGroup ? (
                  <Badge tone="brand">{TEAM_GROUP_LABEL[athlete.teamGroup]}</Badge>
                ) : null}
                {athlete.genderTeam ? (
                  <Badge tone="neutral">
                    {GENDER_TEAM_LABEL[athlete.genderTeam]}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <StatCard
              label="This week"
              value={formatMiles(data.thisWeekMiles)}
              unit="mi"
              className="min-w-[120px]"
              hint={
                change != null ? (
                  <span className={change >= 0 ? "text-success" : "text-gray-500"}>
                    {formatPercent(change)}
                  </span>
                ) : undefined
              }
            />
            <StatCard
              label="Last week"
              value={formatMiles(data.lastWeekMiles)}
              unit="mi"
              tone="ink"
              className="min-w-[120px]"
            />
          </div>
        </div>
      </Card>

      <div>
        <SectionTitle title="Weekly mileage (12 weeks)" />
        <Card>
          <CardContent>
            <MileageBarChart data={data.weekly} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionTitle title="Effort trend" />
          <Card>
            <CardContent>
              <TrendLineChart data={data.effortTrend} domain={[1, 10]} unit="/10" />
            </CardContent>
          </Card>
        </div>
        <div>
          <SectionTitle title="Feeling trend" />
          <Card>
            <CardContent>
              <TrendLineChart
                data={data.feelingTrendData}
                domain={[1, 5]}
                color="#16A34A"
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <SectionTitle title="Recent workouts" />
            {data.recentLogs.length > 0 ? (
              <LogList logs={data.recentLogs} />
            ) : (
              <EmptyState icon={HeartPulse} title="No workouts logged yet" />
            )}
          </div>

          <div>
            <SectionTitle title="Injury & pain history" />
            {data.painHistory.length > 0 ? (
              <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
                {data.painHistory.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 px-4 py-3">
                    <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-injury" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-ink">
                          {formatDate(p.date)}
                        </span>
                        {p.soreness !== "NONE" ? (
                          <Badge tone="warning">
                            {SORENESS_LABEL[p.soreness]} soreness
                          </Badge>
                        ) : null}
                        <FeelingChip feeling={p.feeling} withLabel={false} />
                      </div>
                      {p.notes ? (
                        <p className="mt-0.5 text-sm text-gray-500">{p.notes}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="p-5">
                <p className="text-sm text-gray-400">
                  No pain or injuries reported. 🎉
                </p>
              </Card>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <SectionTitle title="Private coach notes" />
            <Card className="p-4">
              <CoachNotes athleteId={athlete.id} notes={data.notes} />
            </Card>
          </div>

          <div>
            <SectionTitle title="Shoes" />
            {data.shoes.length > 0 ? (
              <div className="space-y-3">
                {data.shoes.map((s) => (
                  <ShoeCard key={s.id} shoe={s} />
                ))}
              </div>
            ) : (
              <Card className="p-5">
                <p className="text-sm text-gray-400">No shoes tracked.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

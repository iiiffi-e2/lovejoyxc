import { Building2 } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeading, SectionTitle } from "@/components/section";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { TeamSignupControls } from "@/components/admin/team-signup-controls";
import { TeamForm } from "./team-form";
import { formatDate } from "@/lib/format";

export default async function AdminTeamsPage() {
  await requireRole("ADMIN");
  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });

  return (
    <div className="space-y-7 animate-fade-in">
      <PageHeading
        title="Teams & seasons"
        description="Organize athletes into teams by season and school year."
      />

      <div>
        <SectionTitle title="Create a team" />
        <Card className="p-5">
          <TeamForm />
        </Card>
      </div>

      <div>
        <SectionTitle title={`Teams (${teams.length})`} />
        {teams.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teams.map((t) => (
              <Card key={t.id} className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-bold text-ink">{t.name}</p>
                    <p className="text-sm text-gray-500">
                      {t.season} · {t.schoolYear}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-gray-400">
                  {t._count.members}{" "}
                  {t._count.members === 1 ? "member" : "members"} · created{" "}
                  {formatDate(t.createdAt)}
                </p>
                <TeamSignupControls
                  id={t.id}
                  signupEnabled={t.signupEnabled}
                  hasCode={!!t.signupCodeHash}
                  signupCodeRotatedAt={t.signupCodeRotatedAt}
                />
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Building2}
            title="No teams yet"
            description="Create your first team above to start organizing athletes."
          />
        )}
      </div>
    </div>
  );
}

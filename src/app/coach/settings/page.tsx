import Link from "next/link";
import { Download, Lock, ShieldCheck, Users } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { isBlobConfigured } from "@/lib/blob-config";
import { prisma } from "@/lib/prisma";
import { PageHeading, SectionTitle } from "@/components/section";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AccountSettings } from "@/components/profile/account-settings";

export default async function CoachSettingsPage() {
  const user = await requireRole("COACH", "ADMIN");
  const blobConfigured = isBlobConfigured();
  const [teams, athleteCount, coachCount] = await Promise.all([
    prisma.team.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.user.count({ where: { role: "ATHLETE", active: true } }),
    prisma.user.count({ where: { role: "COACH" } }),
  ]);

  return (
    <div className="space-y-7 animate-fade-in">
      <PageHeading title="Settings" description="Team configuration and account." />

      <AccountSettings
        name={user.name}
        email={user.email}
        avatarUrl={user.avatarUrl}
        blobConfigured={blobConfigured}
      />

      <div>
        <SectionTitle title="Teams & seasons" />
        <div className="grid gap-3 sm:grid-cols-2">
          {teams.map((t) => (
            <Card key={t.id} className="p-5">
              <p className="font-bold text-ink">{t.name}</p>
              <p className="text-sm text-gray-500">
                {t.season} · {t.schoolYear}
              </p>
            </Card>
          ))}
          {teams.length === 0 ? (
            <Card className="p-5">
              <p className="text-sm text-gray-400">No teams yet.</p>
            </Card>
          ) : null}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Card className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-brand" />
            <div>
              <p className="text-lg font-extrabold text-ink">{athleteCount}</p>
              <p className="text-xs text-gray-500">Active athletes</p>
            </div>
          </Card>
          <Card className="flex items-center gap-3 p-4">
            <ShieldCheck className="h-5 w-5 text-brand" />
            <div>
              <p className="text-lg font-extrabold text-ink">{coachCount}</p>
              <p className="text-xs text-gray-500">Coaches</p>
            </div>
          </Card>
        </div>
      </div>

      <div>
        <SectionTitle title="Data & privacy" />
        <Card className="space-y-4 p-5">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 text-gray-400" />
            <p className="text-sm text-gray-600">
              Lovejoy XC Log is private and team-only. Athletes see only their own
              data; coaches and admins see the full team.
            </p>
          </div>
          <Button asChild variant="outline" size="md">
            <Link href="/coach/logs/export">
              <Download className="h-4 w-4" />
              Export all logs (CSV)
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  );
}

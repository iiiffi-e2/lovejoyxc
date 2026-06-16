import Link from "next/link";
import {
  Building2,
  ShieldCheck,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeading, SectionTitle } from "@/components/section";
import { StatCard } from "@/components/stat-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function AdminOverview() {
  await requireRole("ADMIN");
  const [athletes, inactive, coaches, admins, teams] = await Promise.all([
    prisma.user.count({ where: { role: "ATHLETE", active: true } }),
    prisma.user.count({ where: { active: false } }),
    prisma.user.count({ where: { role: "COACH" } }),
    prisma.user.count({ where: { role: "ADMIN" } }),
    prisma.team.count(),
  ]);

  return (
    <div className="space-y-7 animate-fade-in">
      <PageHeading title="Admin overview" description="Manage your program." />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Active athletes" value={athletes} icon={Users} />
        <StatCard label="Coaches" value={coaches} tone="ink" icon={ShieldCheck} />
        <StatCard label="Admins" value={admins} tone="ink" icon={UserCheck} />
        <StatCard label="Teams" value={teams} tone="brand" icon={Building2} />
      </div>

      <div>
        <SectionTitle title="Quick actions" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="flex flex-col gap-3 p-5">
            <UserPlus className="h-6 w-6 text-brand" />
            <div>
              <p className="font-bold text-ink">Add people</p>
              <p className="text-sm text-gray-500">
                Add athletes, coaches, and assign roles.
              </p>
            </div>
            <Button asChild variant="outline" size="md">
              <Link href="/admin/users">Manage people</Link>
            </Button>
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <Building2 className="h-6 w-6 text-brand" />
            <div>
              <p className="font-bold text-ink">Teams & seasons</p>
              <p className="text-sm text-gray-500">
                Create teams and organize by season.
              </p>
            </div>
            <Button asChild variant="outline" size="md">
              <Link href="/admin/teams">Manage teams</Link>
            </Button>
          </Card>

          <Card className="flex flex-col gap-3 p-5">
            <Users className="h-6 w-6 text-brand" />
            <div>
              <p className="font-bold text-ink">Roster status</p>
              <p className="text-sm text-gray-500">
                {inactive} inactive {inactive === 1 ? "account" : "accounts"}.
              </p>
            </div>
            <Button asChild variant="outline" size="md">
              <Link href="/coach">Team dashboard</Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

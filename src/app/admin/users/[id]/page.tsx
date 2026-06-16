import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateUser } from "@/app/actions/admin";
import { PageHeading } from "@/components/section";
import { Card } from "@/components/ui/card";
import { UserForm } from "../user-form";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("ADMIN");
  const { id } = await params;
  const [user, teams] = await Promise.all([
    prisma.user.findUnique({ where: { id } }),
    prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!user) notFound();

  return (
    <div className="animate-fade-in">
      <Link
        href="/admin/users"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back to people
      </Link>
      <PageHeading title={`Edit ${user.name}`} />
      <Card className="p-5">
        <UserForm
          action={updateUser.bind(null, id)}
          teams={teams}
          mode="edit"
          defaults={{
            name: user.name,
            email: user.email,
            role: user.role,
            grade: user.grade,
            genderTeam: user.genderTeam,
            teamGroup: user.teamGroup,
            teamId: user.teamId,
          }}
        />
      </Card>
    </div>
  );
}

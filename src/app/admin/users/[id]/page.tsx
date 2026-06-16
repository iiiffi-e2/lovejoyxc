import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteUser, updateUser } from "@/app/actions/admin";
import { PageHeading, SectionTitle } from "@/components/section";
import { ROLE_LABEL } from "@/lib/labels";
import { Card } from "@/components/ui/card";
import { DeleteUserButton } from "../delete-user-button";
import { UserForm } from "../user-form";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireRole("ADMIN");
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

      <div className="mt-8">
        <SectionTitle title="Danger zone" />
        <Card className="border-red-200 p-5">
          <p className="text-sm text-gray-600">
            Permanently delete this person and all associated data. This cannot be undone.
          </p>
          <div className="mt-4">
            <DeleteUserButton
              name={user.name}
              roleLabel={ROLE_LABEL[user.role]}
              action={deleteUser.bind(null, id)}
              disabled={user.id === me.id}
              disabledReason="You cannot delete your own account"
              variant="full"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

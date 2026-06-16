import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createUser, deleteUser, toggleUserActive } from "@/app/actions/admin";
import { PageHeading, SectionTitle } from "@/components/section";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/table";
import { UserForm } from "./user-form";
import { ActiveToggle } from "./active-toggle";
import { DeleteUserButton } from "./delete-user-button";
import {
  GENDER_TEAM_LABEL,
  ROLE_LABEL,
  TEAM_GROUP_LABEL,
} from "@/lib/labels";

const ROLE_TONE = {
  ATHLETE: "neutral",
  COACH: "brand",
  ADMIN: "ink",
} as const;

export default async function AdminUsersPage() {
  const me = await requireRole("ADMIN");
  const [users, teams] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
      include: { team: { select: { name: true } } },
    }),
    prisma.team.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-7 animate-fade-in">
      <PageHeading
        title="People"
        description="Add athletes and coaches, assign roles, and manage the roster."
      />

      <div>
        <SectionTitle title="Add a person" />
        <Card className="p-5">
          <UserForm action={createUser} teams={teams} mode="create" />
        </Card>
      </div>

      <div>
        <SectionTitle title={`Roster (${users.length})`} />
        <TableWrap>
          <Table>
            <thead>
              <Tr className="border-t-0">
                <Th>Name</Th>
                <Th>Role</Th>
                <Th>Grade</Th>
                <Th>Group</Th>
                <Th>Team</Th>
                <Th>Status</Th>
                <Th />
              </Tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <Tr key={u.id} className="hover:bg-surface">
                  <Td>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="font-semibold text-ink hover:text-brand"
                    >
                      {u.name}
                    </Link>
                    <p className="text-xs text-gray-400">{u.email}</p>
                  </Td>
                  <Td>
                    <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  </Td>
                  <Td className="text-gray-500">{u.grade ?? "—"}</Td>
                  <Td className="text-gray-500">
                    {u.teamGroup ? TEAM_GROUP_LABEL[u.teamGroup] : "—"}
                    {u.genderTeam ? ` · ${GENDER_TEAM_LABEL[u.genderTeam]}` : ""}
                  </Td>
                  <Td className="text-gray-500">{u.team?.name ?? "—"}</Td>
                  <Td>
                    {u.active ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="neutral">Inactive</Badge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <ActiveToggle
                        active={u.active}
                        action={toggleUserActive.bind(null, u.id)}
                        disabled={u.id === me.id}
                      />
                      <DeleteUserButton
                        name={u.name}
                        roleLabel={ROLE_LABEL[u.role]}
                        action={deleteUser.bind(null, u.id)}
                        disabled={u.id === me.id}
                        disabledReason="You cannot delete your own account"
                      />
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </div>
    </div>
  );
}

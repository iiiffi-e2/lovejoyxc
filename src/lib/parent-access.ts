import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { GenderTeam, TeamGroup, User } from "@prisma/client";
import { prisma } from "./prisma";
import { requireRole } from "./auth";

export const PARENT_CHILD_COOKIE = "parent_child_id";

export type LinkedAthlete = {
  id: string;
  name: string;
  avatarUrl: string | null;
  teamId: string | null;
  grade: number | null;
  genderTeam: GenderTeam | null;
  teamGroup: TeamGroup | null;
};

export async function getLinkedAthletes(parentId: string): Promise<LinkedAthlete[]> {
  const links = await prisma.parentAthleteLink.findMany({
    where: { parentId, athlete: { active: true } },
    include: {
      athlete: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          teamId: true,
          grade: true,
          genderTeam: true,
          teamGroup: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return links.map((l) => l.athlete);
}

export async function requireParentAccess(athleteId: string): Promise<User> {
  const parent = await requireRole("PARENT");
  const link = await prisma.parentAthleteLink.findUnique({
    where: { parentId_athleteId: { parentId: parent.id, athleteId } },
    include: { athlete: { select: { active: true } } },
  });
  if (!link || !link.athlete.active) redirect("/parent/profile");
  return parent;
}

export async function resolveParentChildId(
  parentId: string,
  queryChildId?: string,
): Promise<string | null> {
  const linked = await getLinkedAthletes(parentId);
  if (linked.length === 0) return null;

  if (queryChildId && linked.some((a) => a.id === queryChildId)) {
    await persistParentChildSelection(queryChildId);
    return queryChildId;
  }

  const store = await cookies();
  const cookieChild = store.get(PARENT_CHILD_COOKIE)?.value;
  if (cookieChild && linked.some((a) => a.id === cookieChild)) {
    return cookieChild;
  }

  const first = linked[0]!.id;
  await persistParentChildSelection(first);
  return first;
}

export async function persistParentChildSelection(childId: string) {
  const store = await cookies();
  store.set(PARENT_CHILD_COOKIE, childId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function getAthleteForParent(athleteId: string) {
  await requireParentAccess(athleteId);
  return prisma.user.findUnique({
    where: { id: athleteId },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      teamId: true,
      grade: true,
      genderTeam: true,
      teamGroup: true,
      active: true,
    },
  });
}

export function parentPath(path: string, childId: string): string {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("child", childId);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : `${base}?child=${encodeURIComponent(childId)}`;
}

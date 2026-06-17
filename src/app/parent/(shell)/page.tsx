import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { resolveParentChildId } from "@/lib/parent-access";

export default async function ParentIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const user = await requireRole("PARENT");
  const sp = await searchParams;
  const childId = await resolveParentChildId(user.id, sp.child);
  if (childId) redirect(`/parent/dashboard?child=${childId}`);
  redirect("/parent/profile");
}

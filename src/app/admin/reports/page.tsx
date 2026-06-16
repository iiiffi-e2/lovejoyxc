import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";

export default async function AdminReportsPage() {
  await requireRole("ADMIN");
  redirect("/coach/reports");
}

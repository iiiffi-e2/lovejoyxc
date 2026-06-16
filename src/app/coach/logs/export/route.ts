import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getCoachLogs, type CoachFilters } from "@/lib/queries";
import { logsToCsv } from "@/lib/csv";
import { dateInputToUTC } from "@/lib/format";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "COACH" && user.role !== "ADMIN")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const filters: CoachFilters = {
    athleteId: sp.get("athleteId") || undefined,
    grade: sp.get("grade") ? Number(sp.get("grade")) : undefined,
    teamGroup: sp.get("teamGroup") || undefined,
    genderTeam: sp.get("genderTeam") || undefined,
    workoutType: sp.get("workoutType") || undefined,
    from: sp.get("from") ? dateInputToUTC(sp.get("from")!) : undefined,
    to: sp.get("to") ? dateInputToUTC(sp.get("to")!) : undefined,
  };

  const logs = await getCoachLogs(filters, 5000);
  const csv = logsToCsv(logs);
  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lovejoy-xc-logs-${stamp}.csv"`,
    },
  });
}

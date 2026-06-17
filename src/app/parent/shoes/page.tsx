import { redirect } from "next/navigation";
import { Footprints } from "lucide-react";
import { requireRole } from "@/lib/auth";
import {
  getAthleteForParent,
  resolveParentChildId,
} from "@/lib/parent-access";
import { getAthleteShoes } from "@/lib/queries";
import { PageHeading, SectionTitle } from "@/components/section";
import { ShoeCard } from "@/components/shoe-card";
import { EmptyState } from "@/components/empty-state";
import { ChildHeader } from "@/components/parent/child-header";

export default async function ParentShoesPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const user = await requireRole("PARENT");
  const sp = await searchParams;
  const childId = await resolveParentChildId(user.id, sp.child);
  if (!childId) redirect("/parent/profile");

  const athlete = await getAthleteForParent(childId);
  if (!athlete) redirect("/parent/profile");

  const shoes = await getAthleteShoes(childId);
  const active = shoes.filter((s) => !s.retired);
  const retired = shoes.filter((s) => s.retired);

  return (
    <div className="space-y-6 animate-fade-in">
      <ChildHeader athlete={athlete} />
      <PageHeading
        title="Shoes"
        description="Mileage tracked on each pair."
      />

      <div>
        <SectionTitle title={`Active shoes (${active.length})`} />
        {active.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((shoe) => (
              <ShoeCard key={shoe.id} shoe={shoe} runs={shoe._count.workoutLogs} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Footprints}
            title="No active shoes"
            description="No shoes are being tracked yet."
          />
        )}
      </div>

      {retired.length > 0 ? (
        <div>
          <SectionTitle title={`Retired (${retired.length})`} />
          <div className="grid gap-3 sm:grid-cols-2">
            {retired.map((shoe) => (
              <ShoeCard key={shoe.id} shoe={shoe} runs={shoe._count.workoutLogs} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

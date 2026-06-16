import { Footprints } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getAthleteShoes } from "@/lib/queries";
import { toggleRetireShoe as retire, deleteShoe as remove } from "@/app/actions/shoe";
import { PageHeading, SectionTitle } from "@/components/section";
import { ShoeCard } from "@/components/shoe-card";
import { EmptyState } from "@/components/empty-state";
import { AddShoeForm } from "./add-shoe-form";
import { ShoeActions } from "./shoe-actions";

export default async function ShoesPage() {
  const user = await requireRole("ATHLETE");
  const shoes = await getAthleteShoes(user.id);
  const active = shoes.filter((s) => !s.retired);
  const retired = shoes.filter((s) => s.retired);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeading
        title="Shoes"
        description="Track mileage so you know when it's time for a new pair."
      />

      <AddShoeForm />

      <div>
        <SectionTitle title={`Active shoes (${active.length})`} />
        {active.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {active.map((shoe) => (
              <div key={shoe.id}>
                <ShoeCard shoe={shoe} runs={shoe._count.workoutLogs} />
                <ShoeActions
                  retired={shoe.retired}
                  retireAction={retire.bind(null, shoe.id)}
                  deleteAction={remove.bind(null, shoe.id)}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Footprints}
            title="No active shoes"
            description="Add a pair above to start tracking mileage."
          />
        )}
      </div>

      {retired.length > 0 ? (
        <div>
          <SectionTitle title={`Retired (${retired.length})`} />
          <div className="grid gap-3 sm:grid-cols-2">
            {retired.map((shoe) => (
              <div key={shoe.id}>
                <ShoeCard shoe={shoe} runs={shoe._count.workoutLogs} />
                <ShoeActions
                  retired={shoe.retired}
                  retireAction={retire.bind(null, shoe.id)}
                  deleteAction={remove.bind(null, shoe.id)}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

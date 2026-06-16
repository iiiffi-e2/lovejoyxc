import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteLog, updateLog } from "@/app/actions/workout";
import { WorkoutForm } from "@/components/workout-form";
import { PageHeading } from "@/components/section";
import { DeleteLogButton } from "./delete-button";
import { toDateInputValue } from "@/lib/format";

export default async function EditLogPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("ATHLETE");

  const log = await prisma.workoutLog.findUnique({ where: { id } });
  if (!log || log.athleteId !== user.id) notFound();

  const shoes = await prisma.shoe.findMany({
    where: { athleteId: user.id, retired: false },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  const updateBound = updateLog.bind(null, id);
  const deleteBound = deleteLog.bind(null, id);

  return (
    <div className="animate-fade-in">
      <PageHeading title="Edit log" description="Update the details of this workout." />
      <WorkoutForm
        action={updateBound}
        shoes={shoes}
        submitLabel="Save changes"
        defaults={{
          date: toDateInputValue(log.date),
          workoutType: log.workoutType,
          distance: log.distance,
          durationSec: log.durationSec,
          shoeId: log.shoeId,
          effort: log.effort,
          feeling: log.feeling,
          soreness: log.soreness,
          painFlag: log.painFlag,
          surface: log.surface,
          notes: log.notes,
        }}
      />
      <div className="mt-4">
        <DeleteLogButton action={deleteBound} />
      </div>
    </div>
  );
}

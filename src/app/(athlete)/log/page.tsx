import { Moon } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createLog, logRestDay } from "@/app/actions/workout";
import { WorkoutForm } from "@/components/workout-form";
import { PageHeading } from "@/components/section";
import { Button } from "@/components/ui/button";

export default async function LogPage() {
  const user = await requireRole("ATHLETE");
  const shoes = await prisma.shoe.findMany({
    where: { athleteId: user.id, retired: false },
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="animate-fade-in">
      <PageHeading
        title="Log Today's Run"
        description="Quick and simple — most runs take under 30 seconds."
      />

      <form action={logRestDay} className="mb-6">
        <Button type="submit" variant="outline" size="lg" className="w-full">
          <Moon className="h-5 w-5" />
          Log a Rest Day (one tap)
        </Button>
      </form>

      <WorkoutForm action={createLog} shoes={shoes} submitLabel="Save run" />
    </div>
  );
}

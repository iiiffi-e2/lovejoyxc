-- DropForeignKey
ALTER TABLE "ScheduleEvent" DROP CONSTRAINT "ScheduleEvent_createdById_fkey";

-- AlterTable
ALTER TABLE "ScheduleEvent" ALTER COLUMN "createdById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "ScheduleEvent" ADD CONSTRAINT "ScheduleEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

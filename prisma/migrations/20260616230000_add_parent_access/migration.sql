-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PARENT';

-- CreateTable
CREATE TABLE "ParentAthleteLink" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentAthleteLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentInviteToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentInviteToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParentAthleteLink_athleteId_idx" ON "ParentAthleteLink"("athleteId");

-- CreateIndex
CREATE INDEX "ParentAthleteLink_parentId_idx" ON "ParentAthleteLink"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentAthleteLink_parentId_athleteId_key" ON "ParentAthleteLink"("parentId", "athleteId");

-- CreateIndex
CREATE INDEX "ParentInviteToken_tokenHash_idx" ON "ParentInviteToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ParentInviteToken_athleteId_email_idx" ON "ParentInviteToken"("athleteId", "email");

-- AddForeignKey
ALTER TABLE "ParentAthleteLink" ADD CONSTRAINT "ParentAthleteLink_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentAthleteLink" ADD CONSTRAINT "ParentAthleteLink_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentAthleteLink" ADD CONSTRAINT "ParentAthleteLink_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentInviteToken" ADD CONSTRAINT "ParentInviteToken_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentInviteToken" ADD CONSTRAINT "ParentInviteToken_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
import "server-only";
import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma";

const TOKEN_BYTES = 32;
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createParentInviteToken(
  athleteId: string,
  email: string,
  invitedById: string,
): Promise<string> {
  const raw = randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + EXPIRY_MS);
  const normalized = email.trim().toLowerCase();

  await prisma.$transaction([
    prisma.parentInviteToken.updateMany({
      where: {
        athleteId,
        email: normalized,
        acceptedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    }),
    prisma.parentInviteToken.create({
      data: {
        athleteId,
        email: normalized,
        invitedById,
        tokenHash,
        expiresAt,
      },
    }),
  ]);

  return raw;
}

export async function validateParentInviteToken(raw: string) {
  const tokenHash = hashToken(raw);
  return prisma.parentInviteToken.findFirst({
    where: {
      tokenHash,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      athlete: { select: { id: true, name: true, active: true } },
      invitedBy: { select: { name: true } },
    },
  });
}

export async function consumeParentInviteToken(raw: string) {
  const record = await validateParentInviteToken(raw);
  if (!record || !record.athlete.active) return null;

  await prisma.parentInviteToken.update({
    where: { id: record.id },
    data: { acceptedAt: new Date() },
  });

  return record;
}

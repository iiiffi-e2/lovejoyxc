import "server-only";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export function generateInviteCode(): string {
  const suffix = Array.from({ length: 6 }, () =>
    CODE_CHARS[randomBytes(1)[0]! % CODE_CHARS.length],
  ).join("");
  return `LJXC-${suffix}`;
}

export async function hashInviteCode(code: string): Promise<string> {
  return bcrypt.hash(code.trim().toUpperCase(), 10);
}

export async function verifyInviteCode(
  code: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) return false;
  return bcrypt.compare(code.trim().toUpperCase(), hash);
}

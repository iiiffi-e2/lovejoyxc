# Athlete Signup, Auth & Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let athletes self-register with a season invite code, upload profile photos, reset passwords via email magic link, and let coaches edit athlete emails — while keeping the app closed to the public.

**Architecture:** Extend Prisma schema (`Team` signup fields, `User.avatarUrl`, `PasswordResetToken`). Shared libs for invite codes, rate limiting, and email. Public routes for signup/forgot/reset; admin team-card controls for codes; Vercel Blob for avatars; Resend for reset emails. Reuse existing session auth (`createSession`, `requireRole`).

**Tech Stack:** Next.js 16 App Router, Prisma 6, PostgreSQL, bcrypt, Resend, `@vercel/blob`, `sharp` (avatar resize), Zod

**Spec:** `docs/superpowers/specs/2026-06-16-athlete-signup-auth-design.md`

**Note:** This repo has no automated test runner. Verification = `npm run lint`, `npm run build`, and manual QA steps listed per task.

---

## File Map

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | Schema: Team signup fields, User.avatarUrl, PasswordResetToken |
| `src/lib/invite-code.ts` | Generate readable codes; hash/verify with bcrypt |
| `src/lib/rate-limit.ts` | IP-based rate limiting (in-memory, best-effort on serverless) |
| `src/lib/email.ts` | Resend wrapper; console fallback in dev |
| `src/lib/password-reset.ts` | Create/consume reset tokens (SHA-256 hash) |
| `src/lib/initials.ts` | Shared initials helper (DRY for UserAvatar) |
| `src/app/signup/` | Public athlete registration |
| `src/app/forgot-password/` | Request reset link |
| `src/app/reset-password/` | Set new password from token |
| `src/app/actions/admin.ts` | Team signup code actions (extend) |
| `src/app/actions/avatar.ts` | Upload/remove avatar |
| `src/app/actions/coach.ts` | Update athlete email (extend) |
| `src/components/user-avatar.tsx` | Photo or initials display |
| `src/components/admin/team-signup-controls.tsx` | Per-team code UI |
| `src/components/profile/avatar-upload.tsx` | Profile page upload UI |
| `src/components/coach/athlete-email-edit.tsx` | Inline email edit on coach profile |

---

## Task 1: Schema & Dependencies

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `package.json` (via npm install)
- Modify: `.env.example`

- [ ] **Step 1: Add schema fields**

In `prisma/schema.prisma`, extend `Team`:

```prisma
signupCodeHash      String?
signupEnabled       Boolean   @default(false)
signupCodeRotatedAt DateTime?
```

Extend `User`:

```prisma
avatarUrl             String?
passwordResetTokens   PasswordResetToken[]
```

Add model:

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  tokenHash String
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@index([tokenHash])
}
```

- [ ] **Step 2: Push schema**

Run: `npm run db:push`  
Expected: Schema synced without errors.

- [ ] **Step 3: Install packages**

Run: `npm install resend @vercel/blob sharp`  
Run: `npm install -D @types/sharp` (if needed)

- [ ] **Step 4: Update `.env.example`**

Add:

```env
# --- App URL (password reset links) ---
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# --- Vercel Blob (avatar uploads; optional in local dev) ---
BLOB_READ_WRITE_TOKEN=""

# --- Resend (password reset emails; optional in local dev) ---
RESEND_API_KEY=""
EMAIL_FROM="Lovejoy XC Log <noreply@yourdomain.com>"
```

- [ ] **Step 5: Verify build**

Run: `npm run build`  
Expected: PASS (no type errors from new Prisma fields after generate).

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma package.json package-lock.json .env.example
git commit -m "feat: add schema and deps for signup, avatars, and password reset"
```

---

## Task 2: Shared Libraries

**Files:**
- Create: `src/lib/initials.ts`
- Create: `src/lib/invite-code.ts`
- Create: `src/lib/rate-limit.ts`
- Create: `src/lib/email.ts`
- Create: `src/lib/password-reset.ts`

- [ ] **Step 1: Create `src/lib/initials.ts`**

```typescript
export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
```

- [ ] **Step 2: Create `src/lib/invite-code.ts`**

```typescript
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
```

- [ ] **Step 3: Create `src/lib/rate-limit.ts`**

```typescript
import "server-only";
import { headers } from "next/headers";

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: true } | { ok: false } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (entry.count >= limit) return { ok: false };
  entry.count += 1;
  return { ok: true };
}
```

- [ ] **Step 4: Create `src/lib/email.ts`**

```typescript
import "server-only";
import { Resend } from "resend";

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    console.log(`[dev] Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to,
    subject: "Reset your Lovejoy XC Log password",
    text: `Reset your password by visiting this link (expires in 1 hour):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
  });
}
```

- [ ] **Step 5: Create `src/lib/password-reset.ts`**

```typescript
import "server-only";
import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma";

const TOKEN_BYTES = 32;
const EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export async function createPasswordResetToken(
  userId: string,
): Promise<string> {
  const raw = randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + EXPIRY_MS);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { userId, usedAt: null },
    }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    }),
  ]);

  return raw;
}

export async function consumePasswordResetToken(raw: string) {
  const tokenHash = hashToken(raw);
  const record = await prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  if (!record || !record.user.active) return null;

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return record.user;
}

export async function validatePasswordResetToken(raw: string) {
  const tokenHash = hashToken(raw);
  return prisma.passwordResetToken.findFirst({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
  });
}
```

- [ ] **Step 6: Verify build**

Run: `npm run build`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/initials.ts src/lib/invite-code.ts src/lib/rate-limit.ts src/lib/email.ts src/lib/password-reset.ts
git commit -m "feat: add shared libs for invite codes, rate limit, email, and password reset"
```

---

## Task 3: Admin Team Signup Code Management

**Files:**
- Modify: `src/app/actions/admin.ts`
- Create: `src/components/admin/team-signup-controls.tsx`
- Modify: `src/app/admin/teams/page.tsx`
- Modify: `src/app/admin/teams/team-form.tsx`

- [ ] **Step 1: Extend `AdminState` and add team signup actions in `admin.ts`**

Add to exports:

```typescript
export type AdminState = {
  error?: string;
  ok?: boolean;
  generatedCode?: string; // plaintext shown once
};
```

Add actions:

```typescript
import { generateInviteCode, hashInviteCode } from "@/lib/invite-code";

export async function toggleTeamSignup(teamId: string): Promise<AdminState> {
  await requireRole("ADMIN");
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { error: "Team not found." };
  if (!team.signupEnabled && !team.signupCodeHash) {
    return { error: "Generate an invite code before enabling signup." };
  }
  await prisma.team.update({
    where: { id: teamId },
    data: { signupEnabled: !team.signupEnabled },
  });
  revalidatePath("/admin/teams");
  return { ok: true };
}

export async function generateTeamSignupCode(teamId: string): Promise<AdminState> {
  await requireRole("ADMIN");
  const code = generateInviteCode();
  await prisma.team.update({
    where: { id: teamId },
    data: {
      signupCodeHash: await hashInviteCode(code),
      signupCodeRotatedAt: new Date(),
    },
  });
  revalidatePath("/admin/teams");
  return { ok: true, generatedCode: code };
}

export async function rotateTeamSignupCode(teamId: string): Promise<AdminState> {
  return generateTeamSignupCode(teamId);
}
```

Update `createTeam` to accept optional `enableSignup`:

```typescript
const parsed = teamSchema.safeParse({ ... });
const enableSignup = formData.get("enableSignup") === "on";

// after prisma.team.create:
let generatedCode: string | undefined;
if (enableSignup) {
  const code = generateInviteCode();
  generatedCode = code;
  await prisma.team.update({
    where: { id: team.id },
    data: {
      signupCodeHash: await hashInviteCode(code),
      signupEnabled: true,
      signupCodeRotatedAt: new Date(),
    },
  });
}
return { ok: true, generatedCode };
```

Capture created team id from create result:

```typescript
const team = await prisma.team.create({ data: parsed.data });
```

- [ ] **Step 2: Create `src/components/admin/team-signup-controls.tsx`**

Client component with buttons calling the server actions via `useTransition` or small forms. Show:
- Badge: signup open/closed
- Toggle signup button
- Generate code button (if no hash)
- Rotate code button (if hash exists)
- Copyable banner when `generatedCode` returned via state/callback

Use existing `Button`, `Badge` components.

- [ ] **Step 3: Update `team-form.tsx`**

Add checkbox:

```tsx
<label className="flex items-center gap-2 text-sm font-medium text-ink">
  <input type="checkbox" name="enableSignup" className="rounded border-line" />
  Enable athlete signup (generates invite code)
</label>
```

Show `state.generatedCode` in a copyable `<code>` block when present.

- [ ] **Step 4: Update `admin/teams/page.tsx`**

On each team card, render `<TeamSignupControls team={t} />` passing:
`id`, `signupEnabled`, `signupCodeHash` (boolean `hasCode = !!signupCodeHash`), `signupCodeRotatedAt`.

- [ ] **Step 5: Manual QA**

1. Log in as admin
2. Create team with "Enable athlete signup" checked → code shown once
3. Toggle signup closed/open
4. Rotate code → old code invalid (test in Task 4)

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/admin.ts src/components/admin/team-signup-controls.tsx src/app/admin/teams/
git commit -m "feat: admin team invite code management"
```

---

## Task 4: Athlete Signup Flow

**Files:**
- Create: `src/app/signup/page.tsx`
- Create: `src/app/signup/signup-form.tsx`
- Create: `src/app/signup/actions.ts`
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/login/login-form.tsx`

- [ ] **Step 1: Create `src/app/signup/actions.ts`**

```typescript
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, roleHome } from "@/lib/auth";
import { verifyInviteCode } from "@/lib/invite-code";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const signupSchema = z.object({
  inviteCode: z.string().min(1, "Invite code is required"),
  name: z.string().min(1, "Name is required").max(120),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  grade: z.coerce.number().int().min(7).max(12),
});

export type SignupState = { error?: string };

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const ip = await getClientIp();
  if (!checkRateLimit(`signup:${ip}`, 10, 15 * 60 * 1000).ok) {
    return { error: "Too many attempts. Try again later." };
  }

  const parsed = signupSchema.safeParse({
    inviteCode: formData.get("inviteCode"),
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: formData.get("password"),
    grade: formData.get("grade"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }
  const d = parsed.data;

  const teams = await prisma.team.findMany({
    where: { signupEnabled: true, signupCodeHash: { not: null } },
  });

  let matchedTeam: (typeof teams)[number] | null = null;
  for (const team of teams) {
    if (await verifyInviteCode(d.inviteCode, team.signupCodeHash)) {
      matchedTeam = team;
      break;
    }
  }
  if (!matchedTeam) {
    return { error: "Invalid invite code or signup is closed." };
  }

  const existing = await prisma.user.findUnique({ where: { email: d.email } });
  if (existing) {
    return { error: "An account with that email already exists. Try logging in." };
  }

  const user = await prisma.user.create({
    data: {
      name: d.name,
      email: d.email,
      passwordHash: await hashPassword(d.password),
      role: "ATHLETE",
      grade: d.grade,
      teamId: matchedTeam.id,
      active: true,
    },
  });

  await createSession(user.id);
  redirect(roleHome(user.role));
}
```

- [ ] **Step 2: Create `src/app/signup/signup-form.tsx`**

Mirror `login-form.tsx` pattern with fields: inviteCode, name, email, password, grade `<select>` (7–12).

- [ ] **Step 3: Create `src/app/signup/page.tsx`**

Mirror `login/page.tsx` — redirect if already logged in; render Logo + SignupForm.

- [ ] **Step 4: Add links on login page**

In `login-form.tsx`, below submit button:

```tsx
<p className="text-center text-sm text-gray-500">
  <a href="/forgot-password" className="font-semibold text-brand hover:underline">
    Forgot password?
  </a>
</p>
```

In `login/page.tsx`, below the card:

```tsx
<p className="mt-4 text-center text-sm text-gray-500">
  New athlete?{" "}
  <a href="/signup" className="font-semibold text-brand hover:underline">
    Sign up with your team code
  </a>
</p>
```

- [ ] **Step 5: Manual QA**

1. Enable signup on a team with known code
2. Visit `/signup`, register new athlete
3. Confirm redirect to `/dashboard`, user has correct teamId and grade
4. Wrong code → generic error
5. Duplicate email → specific error

- [ ] **Step 6: Commit**

```bash
git add src/app/signup/ src/app/login/
git commit -m "feat: athlete signup with team invite code"
```

---

## Task 5: Forgot & Reset Password

**Files:**
- Create: `src/app/forgot-password/page.tsx`
- Create: `src/app/forgot-password/forgot-form.tsx`
- Create: `src/app/forgot-password/actions.ts`
- Create: `src/app/reset-password/page.tsx`
- Create: `src/app/reset-password/reset-form.tsx`
- Create: `src/app/reset-password/actions.ts`

- [ ] **Step 1: Create `src/app/forgot-password/actions.ts`**

```typescript
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

export type ForgotState = { ok?: boolean; error?: string };

const SUCCESS_MSG =
  "If an account exists for that email, we sent a reset link.";

export async function forgotPasswordAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const ip = await getClientIp();
  if (!checkRateLimit(`forgot:${ip}`, 5, 15 * 60 * 1000).ok) {
    return { error: "Too many attempts. Try again later." };
  }

  const parsed = schema.safeParse({
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });

  if (user?.active) {
    const raw = await createPasswordResetToken(user.id);
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const resetUrl = `${base}/reset-password?token=${raw}`;
    await sendPasswordResetEmail(user.email, resetUrl);
  }

  return { ok: true, error: SUCCESS_MSG };
}
```

Note: return `error` field with success message OR use separate `message` field — prefer `{ ok: true, message: SUCCESS_MSG }` and update type:

```typescript
export type ForgotState = { ok?: boolean; error?: string; message?: string };
```

Display `message` in green on success.

- [ ] **Step 2: Create forgot-password page + form**

Same layout as login. On success show message (always the same text).

- [ ] **Step 3: Create `src/app/reset-password/actions.ts`**

```typescript
"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  consumePasswordResetToken,
  validatePasswordResetToken,
} from "@/lib/password-reset";
import { createSession, hashPassword, roleHome } from "@/lib/auth";

const schema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords do not match.",
    path: ["confirm"],
  });

export type ResetState = { error?: string };

export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = schema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid form." };
  }

  const user = await consumePasswordResetToken(parsed.data.token);
  if (!user) {
    return {
      error: "This reset link is invalid or has expired. Request a new one.",
    };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);

  await createSession(user.id);
  redirect(roleHome(user.role));
}
```

- [ ] **Step 4: Create reset-password page**

Server component reads `searchParams.token`. If missing or `validatePasswordResetToken` fails, show error + link to `/forgot-password`. Otherwise render form with hidden `token` input.

- [ ] **Step 5: Manual QA**

1. `/forgot-password` with known email → check console for reset URL (dev)
2. Open reset URL → set new password → logged in
3. Re-use same URL → error
4. Unknown email → same success message, no console log

- [ ] **Step 6: Commit**

```bash
git add src/app/forgot-password/ src/app/reset-password/
git commit -m "feat: forgot password flow with email magic link"
```

---

## Task 6: UserAvatar Component

**Files:**
- Create: `src/components/user-avatar.tsx`
- Modify: `src/components/nav/user-menu.tsx`
- Modify: `src/components/nav/top-bar.tsx`
- Modify: `src/app/(athlete)/layout.tsx`
- Modify: `src/app/coach/layout.tsx`
- Modify: `src/app/admin/layout.tsx`

- [ ] **Step 1: Create `src/components/user-avatar.tsx`**

```tsx
import Image from "next/image";
import { initials } from "@/lib/initials";
import { cn } from "@/lib/cn"; // or clsx/tailwind-merge pattern used in project

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-xs",
  lg: "h-16 w-16 text-xl",
} as const;

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const dim = sizes[size];
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt=""
        width={64}
        height={64}
        className={cn("rounded-full object-cover", dim, className)}
      />
    );
  }
  return (
    <span
      className={cn(
        "flex items-center justify-center rounded-full bg-ink font-bold text-white",
        dim,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
```

Check if project has `cn` helper — if not, use inline `clsx` like other components.

Add remote pattern to `next.config.ts` for Vercel Blob host:

```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
  ],
},
```

- [ ] **Step 2: Pass `avatarUrl` through layouts**

Update `TopBar` user prop: `{ name, role, avatarUrl? }`.  
Update layouts to pass `user.avatarUrl`.  
Replace initials span in `UserMenu` with `<UserAvatar name={name} avatarUrl={avatarUrl} size="sm" />`.

- [ ] **Step 3: Commit**

```bash
git add src/components/user-avatar.tsx src/components/nav/ src/app/**/layout.tsx next.config.ts
git commit -m "feat: add shared UserAvatar component"
```

---

## Task 7: Profile Picture Upload

**Files:**
- Create: `src/app/actions/avatar.ts`
- Create: `src/components/profile/avatar-upload.tsx`
- Modify: `src/app/(athlete)/profile/page.tsx`

- [ ] **Step 1: Create `src/app/actions/avatar.ts`**

```typescript
"use server";

import { put, del } from "@vercel/blob";
import sharp from "sharp";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export type AvatarState = { error?: string; ok?: boolean };

export async function uploadAvatar(
  _prev: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const user = await requireRole("ATHLETE");
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return { error: "Photo upload is not configured in this environment." };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photo to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Photo must be JPEG, PNG, or WebP under 2 MB." };
  }
  if (!ALLOWED.has(file.type)) {
    return { error: "Photo must be JPEG, PNG, or WebP under 2 MB." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const resized = await sharp(buffer)
    .rotate()
    .resize(256, 256, { fit: "cover" })
    .webp({ quality: 85 })
    .toBuffer();

  const pathname = `avatars/${user.id}.webp`;
  const blob = await put(pathname, resized, {
    access: "public",
    contentType: "image/webp",
    addRandomSuffix: false,
  });

  if (user.avatarUrl) {
    try {
      await del(user.avatarUrl);
    } catch {
      /* old blob may already be gone */
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: blob.url },
  });

  revalidatePath("/profile");
  return { ok: true };
}

export async function removeAvatar(): Promise<AvatarState> {
  const user = await requireRole("ATHLETE");
  if (user.avatarUrl) {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        await del(user.avatarUrl);
      } catch {
        /* ignore */
      }
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: null },
    });
  }
  revalidatePath("/profile");
  return { ok: true };
}
```

- [ ] **Step 2: Create `avatar-upload.tsx`**

Client form with `<input type="file" accept="image/jpeg,image/png,image/webp" capture="user">`, preview, upload + remove buttons. Disable with message when no `BLOB_READ_WRITE_TOKEN`.

- [ ] **Step 3: Update profile page**

Replace initials div with `<UserAvatar>` + `<AvatarUpload avatarUrl={user.avatarUrl} blobConfigured={!!process.env.BLOB_READ_WRITE_TOKEN} />`.

Pass `blobConfigured` from server component checking env.

- [ ] **Step 4: Update coach athlete list and detail**

In `coach/athletes/page.tsx` and `coach/athletes/[id]/page.tsx`, replace inline initials with `<UserAvatar name={...} avatarUrl={...} />`. Ensure queries include `avatarUrl` (default on User model).

- [ ] **Step 5: Manual QA**

1. With Blob token: upload, see photo in profile + nav + coach list
2. Remove photo → initials return
3. Without token: upload disabled gracefully

- [ ] **Step 6: Commit**

```bash
git add src/app/actions/avatar.ts src/components/profile/ src/app/(athlete)/profile/ src/app/coach/athletes/
git commit -m "feat: athlete profile picture upload via Vercel Blob"
```

---

## Task 8: Coach Edits Athlete Email

**Files:**
- Modify: `src/app/actions/coach.ts`
- Create: `src/components/coach/athlete-email-edit.tsx`
- Modify: `src/app/coach/athletes/[id]/page.tsx`

- [ ] **Step 1: Add action to `coach.ts`**

```typescript
const emailSchema = z.object({
  athleteId: z.string().min(1),
  email: z.string().email("Enter a valid email"),
});

export type EmailState = { error?: string; ok?: boolean };

export async function updateAthleteEmail(
  _prev: EmailState,
  formData: FormData,
): Promise<EmailState> {
  await requireRole("COACH", "ADMIN");
  const parsed = emailSchema.safeParse({
    athleteId: formData.get("athleteId"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }

  const athlete = await prisma.user.findUnique({
    where: { id: parsed.data.athleteId },
  });
  if (!athlete || athlete.role !== "ATHLETE") {
    return { error: "Athlete not found." };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing && existing.id !== athlete.id) {
    return { error: "Another account already uses that email." };
  }

  await prisma.user.update({
    where: { id: athlete.id },
    data: { email: parsed.data.email },
  });

  revalidatePath(`/coach/athletes/${athlete.id}`);
  revalidatePath("/coach/athletes");
  return { ok: true };
}
```

- [ ] **Step 2: Create `athlete-email-edit.tsx`**

Inline form: email input (defaultValue), hidden athleteId, save button, error/success feedback via `useActionState`.

- [ ] **Step 3: Replace static email on coach athlete profile**

Swap `<p>{athlete.email}</p>` with `<AthleteEmailEdit athleteId={athlete.id} email={athlete.email} />`.

- [ ] **Step 4: Manual QA**

1. Coach edits athlete email → success
2. Duplicate email → error
3. Athlete logs in with new email

- [ ] **Step 5: Commit**

```bash
git add src/app/actions/coach.ts src/components/coach/athlete-email-edit.tsx src/app/coach/athletes/[id]/page.tsx
git commit -m "feat: coaches can edit athlete email addresses"
```

---

## Task 9: Unassigned Badges & Final Polish

**Files:**
- Modify: `src/app/coach/athletes/page.tsx`
- Modify: `src/app/coach/athletes/[id]/page.tsx`
- Modify: `README.md` (brief signup section)

- [ ] **Step 1: Show "Unassigned" for missing group/gender**

On coach athlete list and detail, when `!athlete.teamGroup` or `!athlete.genderTeam`, render:

```tsx
<Badge tone="neutral">Unassigned</Badge>
```

(in addition to or instead of omitting those badges)

- [ ] **Step 2: Update README**

Add under Admin features:
- Generate season invite codes for athlete self-signup
Add env vars section entries for Blob, Resend, APP_URL

- [ ] **Step 3: Final verification**

Run: `npm run lint`  
Run: `npm run build`  
Expected: both PASS

Manual end-to-end checklist:
- [ ] Admin generates code, enables signup
- [ ] Athlete signs up, lands on dashboard
- [ ] Athlete uploads avatar
- [ ] Coach sees avatar and edits email
- [ ] Forgot password flow works (console in dev, Resend on Vercel)
- [ ] Login links to signup and forgot password

- [ ] **Step 4: Commit**

```bash
git add src/app/coach/athletes/ README.md
git commit -m "chore: unassigned badges, docs, and signup polish"
```

---

## Spec Coverage Checklist

| Spec requirement | Task |
|---|---|
| Team signup fields | Task 1 |
| PasswordResetToken model | Task 1 |
| User.avatarUrl | Task 1 |
| Invite code generate/verify | Task 2 |
| Rate limiting | Task 2, 4, 5 |
| Admin code management UI | Task 3 |
| Athlete signup flow | Task 4 |
| Login links | Task 4 |
| Forgot password | Task 5 |
| Reset password | Task 5 |
| Resend email | Task 2, 5 |
| UserAvatar component | Task 6, 7 |
| Vercel Blob avatars | Task 7 |
| Coach email edit | Task 8 |
| Unassigned badges | Task 9 |
| .env.example updates | Task 1 |
| Env NEXT_PUBLIC_APP_URL | Task 1, 5 |

All spec requirements mapped. No placeholders remain.

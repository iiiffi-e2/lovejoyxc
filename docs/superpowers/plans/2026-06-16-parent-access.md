# Parent / Guardian Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only `PARENT` role with email invite links so parents can view linked athletes' training logs, shoes, schedule, and profile summary.

**Architecture:** Extend Prisma with `PARENT` role, `ParentAthleteLink`, and `ParentInviteToken` (SHA-256 hashed tokens, 7-day expiry). Server actions handle invite/revoke/accept. Parents use a dedicated `/parent/*` layout with child switcher; all athlete data queries go through `requireParentAccess(childId)`.

**Tech Stack:** Next.js 16 App Router, Prisma 6, PostgreSQL, Zod, server actions, Resend, Tailwind

**Spec:** `docs/superpowers/specs/2026-06-16-parent-access-design.md`

**Note:** This repo has no automated test runner. Verification = `npm run lint`, `npm run build`, and manual QA steps listed per task.

---

## File Map

| File | Responsibility |
|---|---|
| `prisma/schema.prisma` | `PARENT` role, `ParentAthleteLink`, `ParentInviteToken`, User relations |
| `prisma/migrations/.../migration.sql` | Generated migration |
| `src/lib/labels.ts` | `PARENT` in `ROLE_LABEL` |
| `src/lib/auth.ts` | `roleHome(PARENT)`, export helpers |
| `src/lib/parent-access.ts` | Child resolution, `requireParentAccess`, `getLinkedAthletes` |
| `src/lib/parent-invite.ts` | Token create/validate/consume (7-day expiry) |
| `src/lib/email.ts` | `sendParentInviteEmail` |
| `src/lib/queries.ts` | `getParentAccessData(athleteId)` for invite UI |
| `src/app/actions/parent.ts` | Invite, revoke, resend, accept, login+accept, signup+accept |
| `src/app/actions/admin.ts` | Allow `PARENT` in role enum |
| `src/components/parent/child-header.tsx` | Athlete avatar, name, badges |
| `src/components/parent/child-switcher.tsx` | Dropdown when 2+ linked children |
| `src/components/parent/parent-access-section.tsx` | Invite form + active/pending lists |
| `src/components/nav/nav-config.ts` | `parentNav` |
| `src/app/parent/layout.tsx` | Parent shell |
| `src/app/parent/page.tsx` | Redirect to dashboard |
| `src/app/parent/accept/page.tsx` | Public accept flow |
| `src/app/parent/accept/accept-forms.tsx` | Client signup/login forms |
| `src/app/parent/dashboard/page.tsx` | Read-only dashboard |
| `src/app/parent/history/page.tsx` | Read-only history |
| `src/app/parent/schedule/page.tsx` | Read-only schedule |
| `src/app/parent/shoes/page.tsx` | Read-only shoes |
| `src/app/parent/profile/page.tsx` | Parent account + linked children |
| `src/app/(athlete)/profile/page.tsx` | Add parent access section |
| `src/app/coach/athletes/[id]/page.tsx` | Add parent access section |
| `prisma/seed.ts` | Optional sample parent link |

---

## Task 1: Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `PARENT` to Role enum**

```prisma
enum Role {
  ATHLETE
  COACH
  ADMIN
  PARENT
}
```

- [ ] **Step 2: Add models after `CoachNote`**

```prisma
model ParentAthleteLink {
  id          String   @id @default(cuid())
  parentId    String
  parent      User     @relation("ParentLinks", fields: [parentId], references: [id], onDelete: Cascade)
  athleteId   String
  athlete     User     @relation("AthleteParentLinks", fields: [athleteId], references: [id], onDelete: Cascade)
  invitedById String?
  invitedBy   User?    @relation("ParentInvitesSent", fields: [invitedById], references: [id], onDelete: SetNull)
  createdAt   DateTime @default(now())

  @@unique([parentId, athleteId])
  @@index([athleteId])
  @@index([parentId])
}

model ParentInviteToken {
  id          String    @id @default(cuid())
  tokenHash   String
  athleteId   String
  athlete     User      @relation("ParentInviteAthlete", fields: [athleteId], references: [id], onDelete: Cascade)
  email       String
  invitedById String
  invitedBy   User      @relation("ParentInviteSender", fields: [invitedById], references: [id], onDelete: Cascade)
  expiresAt   DateTime
  acceptedAt  DateTime?
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())

  @@index([tokenHash])
  @@index([athleteId, email])
}
```

- [ ] **Step 3: Add User relations**

On `User`, add:

```prisma
parentLinks              ParentAthleteLink[] @relation("ParentLinks")
athleteParentLinks       ParentAthleteLink[] @relation("AthleteParentLinks")
parentInvitesSent        ParentAthleteLink[] @relation("ParentInvitesSent")
parentInvitesAsAthlete   ParentInviteToken[] @relation("ParentInviteAthlete")
parentInvitesCreated     ParentInviteToken[] @relation("ParentInviteSender")
```

- [ ] **Step 4: Create migration**

Run: `npx prisma migrate dev --name add_parent_access`  
Expected: Migration applies without errors.

- [ ] **Step 5: Regenerate client**

Run: `npx prisma generate`  
Expected: `@prisma/client` includes `PARENT`, `ParentAthleteLink`, `ParentInviteToken`.

---

## Task 2: Labels & Auth Plumbing

**Files:**
- Modify: `src/lib/labels.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/app/actions/admin.ts`

- [ ] **Step 1: Add PARENT label**

In `src/lib/labels.ts`, update `ROLE_LABEL`:

```typescript
export const ROLE_LABEL: Record<Role, string> = {
  ATHLETE: "Athlete",
  COACH: "Coach",
  ADMIN: "Admin",
  PARENT: "Parent",
};
```

- [ ] **Step 2: Add `roleHome` case**

In `src/lib/auth.ts`, inside `roleHome`:

```typescript
case "PARENT":
  return "/parent";
```

- [ ] **Step 3: Allow PARENT in admin user schema**

In `src/app/actions/admin.ts`, change role zod enum:

```typescript
role: z.enum(["ATHLETE", "COACH", "ADMIN", "PARENT"]),
```

When creating a `PARENT` user via admin, skip `grade`/`genderTeam`/`teamGroup` requirements (leave null). No `teamId` required for parents.

- [ ] **Step 4: Verify build types**

Run: `npm run lint`  
Expected: No type errors related to `Role`.

---

## Task 3: Parent Access Helpers

**Files:**
- Create: `src/lib/parent-access.ts`

- [ ] **Step 1: Create helper module**

```typescript
import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { requireRole } from "./auth";

export const PARENT_CHILD_COOKIE = "parent_child_id";

export type LinkedAthlete = {
  id: string;
  name: string;
  avatarUrl: string | null;
  teamId: string | null;
  grade: number | null;
  genderTeam: string | null;
  teamGroup: string | null;
};

export async function getLinkedAthletes(parentId: string): Promise<LinkedAthlete[]> {
  const links = await prisma.parentAthleteLink.findMany({
    where: { parentId, athlete: { active: true } },
    include: {
      athlete: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          teamId: true,
          grade: true,
          genderTeam: true,
          teamGroup: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  return links.map((l) => l.athlete);
}

export async function requireParentAccess(athleteId: string): Promise<User> {
  const parent = await requireRole("PARENT");
  const link = await prisma.parentAthleteLink.findUnique({
    where: { parentId_athleteId: { parentId: parent.id, athleteId } },
    include: { athlete: { select: { active: true } } },
  });
  if (!link || !link.athlete.active) redirect("/parent/profile");
  return parent;
}

export async function resolveParentChildId(
  parentId: string,
  queryChildId?: string,
): Promise<string | null> {
  const linked = await getLinkedAthletes(parentId);
  if (linked.length === 0) return null;

  if (queryChildId && linked.some((a) => a.id === queryChildId)) {
    return queryChildId;
  }

  const store = await cookies();
  const cookieChild = store.get(PARENT_CHILD_COOKIE)?.value;
  if (cookieChild && linked.some((a) => a.id === cookieChild)) {
    return cookieChild;
  }

  return linked[0]!.id;
}

export async function getAthleteForParent(athleteId: string) {
  await requireParentAccess(athleteId);
  return prisma.user.findUnique({
    where: { id: athleteId },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      teamId: true,
      grade: true,
      genderTeam: true,
      teamGroup: true,
      active: true,
    },
  });
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`  
Expected: PASS.

---

## Task 4: Invite Token Helpers & Email

**Files:**
- Create: `src/lib/parent-invite.ts`
- Modify: `src/lib/email.ts`

- [ ] **Step 1: Create `src/lib/parent-invite.ts`**

```typescript
import "server-only";
import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma";

const TOKEN_BYTES = 32;
const EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

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
```

- [ ] **Step 2: Add email helper**

Append to `src/lib/email.ts`:

```typescript
export async function sendParentInviteEmail(
  to: string,
  acceptUrl: string,
  athleteName: string,
  inviterName: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  const text =
    `${inviterName} invited you to view ${athleteName}'s training log on Lovejoy XC Log.\n\n` +
    `Accept the invite (expires in 7 days):\n\n${acceptUrl}\n\n` +
    `If you weren't expecting this, you can ignore this email.`;

  if (!apiKey || !from) {
    console.log(`[dev] Parent invite link for ${to}: ${acceptUrl}`);
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to,
    subject: `View ${athleteName}'s training log — Lovejoy XC`,
    text,
  });
}
```

- [ ] **Step 3: Lint**

Run: `npm run lint`  
Expected: PASS.

---

## Task 5: Server Actions

**Files:**
- Create: `src/app/actions/parent.ts`
- Modify: `src/lib/queries.ts` (add `getParentAccessData`)

- [ ] **Step 1: Add query for invite UI**

In `src/lib/queries.ts`:

```typescript
export async function getParentAccessData(athleteId: string) {
  const [links, pendingInvites] = await Promise.all([
    prisma.parentAthleteLink.findMany({
      where: { athleteId },
      include: {
        parent: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.parentInviteToken.findMany({
      where: {
        athleteId,
        acceptedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return { links, pendingInvites };
}
```

- [ ] **Step 2: Create `src/app/actions/parent.ts`**

Implement these exports with `"use server"`:

```typescript
export type ParentActionState = { error?: string; ok?: boolean; message?: string };

const emailSchema = z.string().email("Enter a valid email address.");

function revalidateParentPaths(athleteId: string) {
  revalidatePath("/profile");
  revalidatePath(`/coach/athletes/${athleteId}`);
  revalidatePath("/parent/profile");
  revalidatePath("/parent/dashboard");
}

async function assertCanManageAthleteParentAccess(
  user: User,
  athleteId: string,
): Promise<{ athlete: { id: string; name: string; teamId: string | null } }> {
  if (user.role === "ATHLETE") {
    if (user.id !== athleteId) throw new Error("Forbidden");
    const athlete = await prisma.user.findUnique({
      where: { id: athleteId, role: "ATHLETE", active: true },
      select: { id: true, name: true, teamId: true },
    });
    if (!athlete) throw new Error("Athlete not found");
    return { athlete };
  }

  await requireRole("COACH", "ADMIN");
  const athlete = await prisma.user.findFirst({
    where: { id: athleteId, role: "ATHLETE", active: true },
    select: { id: true, name: true, teamId: true },
  });
  if (!athlete) throw new Error("Athlete not found");
  // Coaches must share team with athlete (admins may cross teams if athlete has teamId)
  if (user.role === "COACH" && user.teamId && athlete.teamId !== user.teamId) {
    throw new Error("Forbidden");
  }
  return { athlete };
}

export async function inviteParent(
  athleteId: string,
  _prev: ParentActionState,
  formData: FormData,
): Promise<ParentActionState> {
  const user = await requireUser();
  const { athlete } = await assertCanManageAthleteParentAccess(user, athleteId);

  const parsed = emailSchema.safeParse(
    String(formData.get("email") ?? "").trim().toLowerCase(),
  );
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email." };
  }
  const email = parsed.data;

  if (!checkRateLimit(`parent-invite:${athleteId}`, 5, 60 * 60 * 1000).ok) {
    return { error: "Too many invites. Try again later." };
  }

  const existingParent = await prisma.user.findUnique({ where: { email } });
  if (existingParent?.role === "PARENT") {
    const existingLink = await prisma.parentAthleteLink.findUnique({
      where: {
        parentId_athleteId: { parentId: existingParent.id, athleteId },
      },
    });
    if (existingLink) {
      return { error: "This parent is already linked." };
    }
  }

  const raw = await createParentInviteToken(athleteId, email, user.id);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const acceptUrl = `${base}/parent/accept?token=${raw}`;
  await sendParentInviteEmail(email, acceptUrl, athlete.name, user.name);

  revalidateParentPaths(athleteId);
  return { ok: true, message: "Invite sent." };
}

export async function revokeParentLink(
  linkId: string,
  athleteId: string,
): Promise<void> {
  const user = await requireUser();
  await assertCanManageAthleteParentAccess(user, athleteId);

  const link = await prisma.parentAthleteLink.findFirst({
    where: { id: linkId, athleteId },
  });
  if (!link) return;

  await prisma.parentAthleteLink.delete({ where: { id: linkId } });
  revalidateParentPaths(athleteId);
}

export async function revokeParentInvite(
  tokenId: string,
  athleteId: string,
): Promise<void> {
  const user = await requireUser();
  await assertCanManageAthleteParentAccess(user, athleteId);

  await prisma.parentInviteToken.updateMany({
    where: { id: tokenId, athleteId, acceptedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  revalidateParentPaths(athleteId);
}

export async function resendParentInvite(
  tokenId: string,
  athleteId: string,
): Promise<void> {
  const user = await requireUser();
  const { athlete } = await assertCanManageAthleteParentAccess(user, athleteId);

  const pending = await prisma.parentInviteToken.findFirst({
    where: {
      id: tokenId,
      athleteId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (!pending) return;

  const raw = await createParentInviteToken(athleteId, pending.email, user.id);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const acceptUrl = `${base}/parent/accept?token=${raw}`;
  await sendParentInviteEmail(pending.email, acceptUrl, athlete.name, user.name);
  revalidateParentPaths(athleteId);
}

async function createLinkFromToken(record: NonNullable<Awaited<ReturnType<typeof validateParentInviteToken>>>) {
  const existingParent = await prisma.user.findUnique({
    where: { email: record.email },
  });

  if (existingParent && existingParent.role !== "PARENT") {
    return { error: "This email is already registered. Use a different email or contact your coach." } as const;
  }

  let parentId = existingParent?.id;

  return { record, parentId, existingParent } as const;
}

export async function signupAndAcceptParentInvite(
  _prev: ParentActionState,
  formData: FormData,
): Promise<ParentActionState> {
  const ip = await getClientIp();
  if (!checkRateLimit(`parent-accept:${ip}`, 10, 15 * 60 * 1000).ok) {
    return { error: "Too many attempts. Try again later." };
  }

  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!token) return { error: "Invalid invite." };
  if (!name) return { error: "Name is required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const record = await validateParentInviteToken(token);
  if (!record) return { error: "This invite link is invalid or has expired." };

  const existing = await prisma.user.findUnique({ where: { email: record.email } });
  if (existing) {
    return { error: "An account already exists for this email. Log in to accept the invite." };
  }

  const consumed = await consumeParentInviteToken(token);
  if (!consumed) return { error: "This invite link is invalid or has expired." };

  const parent = await prisma.user.create({
    data: {
      name,
      email: record.email,
      passwordHash: await hashPassword(password),
      role: "PARENT",
      active: true,
    },
  });

  await prisma.parentAthleteLink.create({
    data: {
      parentId: parent.id,
      athleteId: record.athleteId,
      invitedById: record.invitedById,
    },
  });

  await createSession(parent.id);
  redirect(`/parent/dashboard?child=${record.athleteId}`);
}

export async function loginAndAcceptParentInvite(
  _prev: ParentActionState,
  formData: FormData,
): Promise<ParentActionState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!token) return { error: "Invalid invite." };

  const record = await validateParentInviteToken(token);
  if (!record) return { error: "This invite link is invalid or has expired." };

  const user = await prisma.user.findUnique({ where: { email: record.email } });
  if (!user || !user.active) return { error: "Invalid email or password." };
  if (user.role !== "PARENT") {
    return { error: "This email is already registered. Use a different email or contact your coach." };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return { error: "Invalid email or password." };

  const consumed = await consumeParentInviteToken(token);
  if (!consumed) return { error: "This invite link is invalid or has expired." };

  await prisma.parentAthleteLink.upsert({
    where: { parentId_athleteId: { parentId: user.id, athleteId: record.athleteId } },
    create: {
      parentId: user.id,
      athleteId: record.athleteId,
      invitedById: record.invitedById,
    },
    update: {},
  });

  await createSession(user.id);
  redirect(`/parent/dashboard?child=${record.athleteId}`);
}

export async function acceptParentInviteWhileLoggedIn(token: string): Promise<void> {
  const user = await requireRole("PARENT");
  const record = await validateParentInviteToken(token);
  if (!record) redirect("/parent/profile");

  if (record.email !== user.email) {
    redirect("/parent/profile");
  }

  const consumed = await consumeParentInviteToken(token);
  if (!consumed) redirect("/parent/profile");

  await prisma.parentAthleteLink.upsert({
    where: { parentId_athleteId: { parentId: user.id, athleteId: record.athleteId } },
    create: {
      parentId: user.id,
      athleteId: record.athleteId,
      invitedById: record.invitedById,
    },
    update: {},
  });

  redirect(`/parent/dashboard?child=${record.athleteId}`);
}

export async function removeSelfFromAthlete(athleteId: string): Promise<void> {
  const parent = await requireRole("PARENT");
  await prisma.parentAthleteLink.deleteMany({
    where: { parentId: parent.id, athleteId },
  });
  revalidatePath("/parent/profile");
  revalidatePath("/parent/dashboard");
}
```

Add imports at top: `z`, `redirect`, `revalidatePath`, prisma, auth helpers, rate limit, parent-invite, email.

- [ ] **Step 3: Lint & build**

Run: `npm run lint && npm run build`  
Expected: PASS (pages not created yet is OK if actions compile).

---

## Task 6: Accept Invite Page

**Files:**
- Create: `src/app/parent/accept/page.tsx`
- Create: `src/app/parent/accept/accept-forms.tsx`

- [ ] **Step 1: Create server page**

`src/app/parent/accept/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { validateParentInviteToken } from "@/lib/parent-invite";
import { acceptParentInviteWhileLoggedIn } from "@/app/actions/parent";
import { AcceptForms } from "./accept-forms";
import { Logo } from "@/components/logo";
import { prisma } from "@/lib/prisma";

export default async function ParentAcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const user = await getCurrentUser();

  if (user && user.role === "PARENT" && token) {
    await acceptParentInviteWhileLoggedIn(token);
  }
  if (user && user.role !== "PARENT") {
    return (
      <AcceptShell error="Log out of your current account before accepting this invite." />
    );
  }

  const record = token ? await validateParentInviteToken(token) : null;
  if (!token || !record) {
    return (
      <AcceptShell error="This invite link is invalid or has expired." />
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: record.email } });
  const mode =
    existing?.role === "PARENT" ? "login" : existing ? "blocked" : "signup";

  return (
    <AcceptShell
      athleteName={record.athlete.name}
      inviterName={record.invitedBy.name}
      email={record.email}
    >
      {mode === "blocked" ? (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-injury">
          <AlertCircle className="h-4 w-4 shrink-0" />
          This email is already registered. Use a different email or contact your coach.
        </div>
      ) : (
        <AcceptForms token={token} email={record.email} mode={mode} />
      )}
    </AcceptShell>
  );
}

function AcceptShell({
  children,
  error,
  athleteName,
  inviterName,
  email,
}: {
  children?: React.ReactNode;
  error?: string;
  athleteName?: string;
  inviterName?: string;
  email?: string;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-surface px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" />
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">
            Lovejoy XC Log
          </h1>
          {athleteName ? (
            <p className="mt-1 text-sm text-gray-500">
              {inviterName} invited you to view {athleteName}&rsquo;s training log
            </p>
          ) : (
            <p className="mt-1 text-sm text-gray-500">Parent invite</p>
          )}
        </div>
        <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
          {error ? (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-injury">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : (
            children
          )}
          {email ? (
            <p className="mt-4 text-center text-xs text-gray-400">Invite sent to {email}</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create client forms**

`src/app/parent/accept/accept-forms.tsx` — `"use client"` with `useActionState` for `signupAndAcceptParentInvite` (fields: token hidden, name, password, confirmPassword) and `loginAndAcceptParentInvite` (token hidden, password). Match `/signup` field styling.

- [ ] **Step 3: Manual QA**

1. From dev, call `inviteParent` via UI (Task 12) or temporarily script an invite.
2. Open accept URL from console log.
3. Sign up as new parent → lands on `/parent/dashboard`.

---

## Task 7: Parent Layout, Nav & Child Switcher

**Files:**
- Modify: `src/components/nav/nav-config.ts`
- Create: `src/components/parent/child-switcher.tsx`
- Create: `src/app/parent/layout.tsx`
- Create: `src/app/parent/page.tsx`
- Create: `src/app/actions/parent-child.ts` (set child cookie server action)

- [ ] **Step 1: Add `parentNav`**

In `nav-config.ts`:

```typescript
export const parentNav: NavItem[] = [
  { href: "/parent/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/parent/history", label: "History", icon: "history" },
  { href: "/parent/schedule", label: "Schedule", icon: "schedule" },
  { href: "/parent/shoes", label: "Shoes", icon: "shoes" },
  { href: "/parent/profile", label: "Profile", icon: "profile" },
];
```

- [ ] **Step 2: Child switcher component**

`src/components/parent/child-switcher.tsx` — client component: `<select>` or dropdown listing linked athletes (avatar + name). On change, navigate to current path with `?child=<id>` and POST to `setParentChildAction` to persist cookie.

- [ ] **Step 3: Cookie server action**

`src/app/actions/parent-child.ts`:

```typescript
"use server";
import { cookies } from "next/headers";
import { PARENT_CHILD_COOKIE } from "@/lib/parent-access";

export async function setParentChildAction(athleteId: string) {
  const store = await cookies();
  store.set(PARENT_CHILD_COOKIE, athleteId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
```

- [ ] **Step 4: Parent layout**

Mirror `src/app/(athlete)/layout.tsx` but use `requireRole("PARENT")`, `parentNav`, `homeHref="/parent/dashboard"`. Pass `actions={<ChildSwitcher linked={linked} selectedId={childId} />}` to `TopBar` when `linked.length > 1`.

Resolve `childId` in layout via `resolveParentChildId(user.id, searchParams child)` — read searchParams in layout is tricky in Next 16; alternatively resolve child only in each page and pass switcher from pages. **Simpler approach:** each page resolves child independently; layout only shows switcher if we fetch linked athletes in layout without selected id (switcher reads URL).

- [ ] **Step 5: Redirect root**

`src/app/parent/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { resolveParentChildId } from "@/lib/parent-access";

export default async function ParentIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const user = await requireRole("PARENT");
  const sp = await searchParams;
  const childId = await resolveParentChildId(user.id, sp.child);
  if (childId) redirect(`/parent/dashboard?child=${childId}`);
  redirect("/parent/profile");
}
```

- [ ] **Step 6: Lint**

Run: `npm run lint`  
Expected: PASS.

---

## Task 8: Shared Child Header Component

**Files:**
- Create: `src/components/parent/child-header.tsx`

- [ ] **Step 1: Create component**

Display `UserAvatar` (lg), athlete name, grade/gender/group badges using `GENDER_TEAM_LABEL`, `TEAM_GROUP_LABEL`, `Badge`. Used at top of parent dashboard, history, schedule, shoes pages.

```tsx
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { GENDER_TEAM_LABEL, TEAM_GROUP_LABEL } from "@/lib/labels";
import type { LinkedAthlete } from "@/lib/parent-access";

export function ChildHeader({ athlete }: { athlete: LinkedAthlete }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-white p-4">
      <UserAvatar name={athlete.name} avatarUrl={athlete.avatarUrl} size="lg" />
      <div>
        <h2 className="text-lg font-extrabold text-ink">{athlete.name}</h2>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {athlete.grade ? <Badge tone="ink">Grade {athlete.grade}</Badge> : null}
          {athlete.teamGroup ? (
            <Badge tone="brand">{TEAM_GROUP_LABEL[athlete.teamGroup as never]}</Badge>
          ) : (
            <Badge tone="neutral">Unassigned</Badge>
          )}
          {athlete.genderTeam ? (
            <Badge tone="neutral">{GENDER_TEAM_LABEL[athlete.genderTeam as never]}</Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

---

## Task 9: Parent Dashboard

**Files:**
- Create: `src/app/parent/dashboard/page.tsx`

- [ ] **Step 1: Create read-only dashboard**

Copy structure from `src/app/(athlete)/dashboard/page.tsx` but:

- Use `requireRole("PARENT")` + `resolveParentChildId` + `requireParentAccess`
- Include `<ChildHeader />`
- **Omit** "Log Today's Run" button
- **Omit** edit links to `/log/[id]` — use `<LogList logs={...} />` without `hrefForLog`
- Schedule action links → `/parent/schedule?child=...`
- History action → `/parent/history?child=...`
- Shoes alert link → `/parent/shoes?child=...`
- Call `getAthleteDashboard(childId)` and `getThisWeekSchedule(athlete.teamId)` (same as athlete)

- [ ] **Step 2: Manual QA**

Log in as parent → see stats, this week schedule, recent logs (not clickable), no log button.

---

## Task 10: Parent History, Schedule & Shoes Pages

**Files:**
- Create: `src/app/parent/history/page.tsx`
- Create: `src/app/parent/schedule/page.tsx`
- Create: `src/app/parent/shoes/page.tsx`

- [ ] **Step 1: History page**

Based on athlete history page:
- Resolve child from `searchParams.child`
- `requireParentAccess(childId)`
- Query logs with `athleteId: childId`
- `<ChildHeader />` at top
- `<LogList logs={logs} />` without hrefs
- Preserve `child` in filter form hidden input or query string

- [ ] **Step 2: Schedule page**

```tsx
const athlete = await getAthleteForParent(childId);
const events = athlete?.teamId
  ? await getScheduleEventsForTeam(athlete.teamId)
  : [];
return (
  <>
    <ChildHeader athlete={...} />
    <ScheduleReadonlyPage events={events} noTeam={!athlete?.teamId} />
  </>
);
```

- [ ] **Step 3: Shoes page**

Based on athlete shoes page:
- `<ChildHeader />`
- `getAthleteShoes(childId)`
- Render `ShoeCard` only — **no** `AddShoeForm`, **no** `ShoeActions`

- [ ] **Step 4: Build**

Run: `npm run build`  
Expected: PASS.

---

## Task 11: Parent Profile Page

**Files:**
- Create: `src/app/parent/profile/page.tsx`

- [ ] **Step 1: Create profile page**

- `requireRole("PARENT")`
- Reuse `AccountSettings` for parent's own email/password (same as athlete profile)
- Section **Linked athletes**: list from `getLinkedAthletes(user.id)` with name, avatar, linked date
- Each row: "View dashboard" link + form calling `removeSelfFromAthlete(athleteId)`
- Empty state when no links: "Accept an invite from your athlete or coach to get started."

- [ ] **Step 2: Manual QA**

Parent with 2 children can remove one link; still sees the other.

---

## Task 12: Parent Access Invite UI

**Files:**
- Create: `src/components/parent/parent-access-section.tsx`
- Modify: `src/app/(athlete)/profile/page.tsx`
- Modify: `src/app/coach/athletes/[id]/page.tsx`

- [ ] **Step 1: Create shared section component**

Props: `{ athleteId: string; data: Awaited<ReturnType<typeof getParentAccessData>>; canManage: boolean }`

Contents:
- Email input + "Send invite" form → `inviteParent.bind(null, athleteId)`
- **Active parents** table: name, email, linked date, Revoke button → `revokeParentLink`
- **Pending invites** table: email, sent date, expires, Revoke + Resend buttons
- Success/error messages from action state

- [ ] **Step 2: Athlete profile**

At bottom of `src/app/(athlete)/profile/page.tsx`, add:

```tsx
const parentAccess = await getParentAccessData(user.id);
// ...
<SectionTitle title="Parent / guardian access" />
<ParentAccessSection athleteId={user.id} data={parentAccess} canManage />
```

- [ ] **Step 3: Coach athlete page**

After coach notes section (or before), fetch `getParentAccessData(athlete.id)` and render same component.

- [ ] **Step 4: End-to-end QA**

1. Athlete sends invite → console shows link.
2. Accept as new parent.
3. Athlete profile shows active link.
4. Athlete revokes → parent redirected on next request.

---

## Task 13: Seed Data (Optional)

**Files:**
- Modify: `prisma/seed.ts`

- [ ] **Step 1: Add sample parent**

After athlete users exist, create:

```typescript
const parent = await prisma.user.upsert({
  where: { email: "parent@example.com" },
  update: {},
  create: {
    name: "Sample Parent",
    email: "parent@example.com",
    passwordHash: await hashPassword("password123"),
    role: "PARENT",
    active: true,
  },
});

await prisma.parentAthleteLink.upsert({
  where: { parentId_athleteId: { parentId: parent.id, athleteId: firstAthlete.id } },
  update: {},
  create: { parentId: parent.id, athleteId: firstAthlete.id },
});
```

Run: `npm run db:seed`

---

## Task 14: Final Verification

- [ ] **Step 1: Lint**

Run: `npm run lint`  
Expected: PASS.

- [ ] **Step 2: Production build**

Run: `npm run build`  
Expected: PASS.

- [ ] **Step 3: Manual test checklist (from spec)**

- [ ] Athlete sends invite; email or dev console log works
- [ ] New parent signup via link → dashboard for child
- [ ] Existing parent accepts second child → switcher shows both
- [ ] Parent sees history, schedule, shoes (read-only)
- [ ] Parent sees athlete avatar on child header
- [ ] Parent does not see coach notes or log/edit UI
- [ ] Athlete revokes parent access
- [ ] Coach revokes from athlete page
- [ ] Parent self-removes from profile
- [ ] Expired token (>7 days) rejected
- [ ] Accept with athlete email shows blocked error
- [ ] Rate limit after 5 invites/hour

---

## Spec Coverage Self-Review

| Spec requirement | Task |
|---|---|
| PARENT role | 1, 2 |
| ParentAthleteLink | 1 |
| ParentInviteToken 7-day | 1, 4 |
| Email invite | 4, 5 |
| Athlete + coach invite UI | 12 |
| Accept signup/login | 6, 5 |
| Multi-child / multi-parent | 1, 7, 11 |
| Read-only logs/schedule/shoes | 9, 10 |
| Athlete avatar | 8 |
| Revoke by athlete/coach/parent | 5, 11, 12 |
| No coach notes | (no parent route to coach notes) |
| Rate limiting | 5 |
| Admin PARENT role | 2 |

No placeholders remain. Types consistent: `parentId_athleteId` composite key used throughout.

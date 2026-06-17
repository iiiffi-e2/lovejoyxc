# Parent / Guardian Access — Design Spec

**Date:** 2026-06-16  
**Status:** Approved

## Overview

Add a read-only `PARENT` role so parents and guardians can view their linked athlete's training log, shoes, team schedule, and profile summary. Athletes and coaches/admins can invite parents by email; parents accept via a magic link and set their own password.

## Requirements Summary

| Feature | Decision |
|---|---|
| Who can invite | Athlete (Profile) or coach/admin (athlete detail page) |
| Invite mechanism | Email magic link (7-day expiry) |
| Parent account | New `PARENT` role; self-service signup via accept link |
| Multi-child | One parent account can link to multiple athletes (siblings) |
| Multi-parent | One athlete can have multiple linked parents |
| Access scope | Read-only, child-scoped |
| Revoke access | Athlete, coach/admin, or parent (self-remove) |
| Invite expiry | 7 days |
| Profile photo | Parents see the athlete's avatar on child views |
| Shoes | Parents can view linked athlete's shoes (read-only) |
| Coach notes | Hidden from parents |
| Edit actions | None — no logging, shoe management, or profile edits for the athlete |

---

## 1. Data Model

### Role enum (extend)

```prisma
enum Role {
  ATHLETE
  COACH
  ADMIN
  PARENT
}
```

### ParentAthleteLink (new model)

Junction table for active parent ↔ athlete relationships.

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
```

### ParentInviteToken (new model)

Pending invites before a parent accepts. Mirrors `PasswordResetToken` pattern (SHA-256 hash of raw token, never store plaintext).

```prisma
model ParentInviteToken {
  id          String    @id @default(cuid())
  tokenHash   String
  athleteId   String
  athlete     User      @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  email       String    // normalized (trim, lowercase)
  invitedById String
  invitedBy   User      @relation(fields: [invitedById], references: [id], onDelete: Cascade)
  expiresAt   DateTime  // 7 days from creation
  acceptedAt  DateTime?
  revokedAt   DateTime?
  createdAt   DateTime  @default(now())

  @@index([tokenHash])
  @@index([athleteId, email])
}
```

### User relation updates

```prisma
// On User:
parentLinks         ParentAthleteLink[] @relation("ParentLinks")
athleteParentLinks  ParentAthleteLink[] @relation("AthleteParentLinks")
parentInvitesSent   ParentAthleteLink[] @relation("ParentInvitesSent") // invitedBy only
parentInviteTokensAsAthlete ParentInviteToken[]
parentInviteTokensSent      ParentInviteToken[] // invitedBy
```

(Exact relation field names may be adjusted for clarity during implementation; both sides of each relation must be defined.)

### Design notes

- One email = one role (existing constraint). If invite target email belongs to an `ATHLETE`, `COACH`, or `ADMIN`, the accept flow shows an error — do not upgrade existing accounts to `PARENT`.
- If email already belongs to a `PARENT`, accepting the invite only creates a new `ParentAthleteLink` (no duplicate user).
- Pending invite = `acceptedAt` and `revokedAt` both null, `expiresAt > now()`.
- Re-inviting the same email for the same athlete revokes prior pending tokens for that pair and creates a fresh one.

---

## 2. Invite Flow

### Send invite

1. Inviter (athlete, coach, or admin) enters parent/guardian email on invite UI.
2. Server validates:
   - Inviter is allowed (athlete can only invite for self; coach/admin for any athlete on their team scope).
   - Email is valid.
   - No existing `ParentAthleteLink` for that email's parent user + athlete (if parent account exists).
   - Rate limit: 5 invites per athlete per hour.
3. Revoke any prior pending `ParentInviteToken` for same `athleteId` + `email`.
4. Create `ParentInviteToken` with 7-day expiry; send email via Resend.
5. Always return success message: **"Invite sent."** (Do not reveal whether email is already registered.)

### Accept invite (`/parent/accept?token=...`)

1. Validate token (hash lookup, not expired, not accepted, not revoked).
2. **If user logged in as `PARENT`:** create `ParentAthleteLink`, mark token accepted, redirect to `/parent/dashboard?child=<athleteId>`.
3. **If user logged in as another role:** show error — must log out first.
4. **If not logged in:**
   - Look up user by invite email.
   - **Existing `PARENT`:** show login form; after login, create link.
   - **No account:** show signup form (name, password, confirm password); create `User` with `role: PARENT`, create link, auto-login, redirect to parent dashboard.
   - **Existing non-parent account:** show error — that email is already registered for another role.

### Email

Add `sendParentInviteEmail(to, acceptUrl, athleteName, inviterName)` in `src/lib/email.ts`.

- Subject: e.g. "View [Athlete Name]'s training log — Lovejoy XC"
- Body: plain text with accept link and 7-day expiry note.
- Dev fallback: log link to console when `RESEND_API_KEY` / `EMAIL_FROM` unset (same as password reset).

---

## 3. Revoke Access

| Actor | Can revoke |
|---|---|
| Athlete | Any link on their own profile |
| Coach / admin | Any link on athlete detail page |
| Parent | Self-remove from a linked child on parent profile |

Revoke behavior:

- **Active link:** delete `ParentAthleteLink` row.
- **Pending invite:** set `ParentInviteToken.revokedAt = now()`.

If a parent removes their last child link, the account remains (they may receive future invites). No auto-delete of parent users in v1.

---

## 4. Authorization

### New auth helpers (`src/lib/auth.ts`)

```typescript
roleHome("PARENT") → "/parent"

async function requireParentAccess(athleteId: string): Promise<User>
// requireRole("PARENT") + verify ParentAthleteLink exists; else redirect /parent

async function getLinkedAthletes(parentId: string): Promise<LinkedAthlete[]>
// athletes with id, name, avatarUrl, teamId for switcher
```

### Access matrix

| Resource | Parent access |
|---|---|
| Workout logs | Read linked athlete only |
| Dashboard stats | Read linked athlete only |
| History | Read linked athlete only |
| Schedule | Read via linked athlete's `teamId` |
| Shoes | Read linked athlete only (no add/edit/retire/delete) |
| Athlete profile summary | Read: name, grade, gender team, team group, avatar, aggregate stats |
| Coach notes | Denied |
| Other athletes | Denied |
| Log / edit / delete | Denied |

All parent pages resolve a **selected child** from query param `?child=<athleteId>` or cookie `parent_child_id`. Default to first linked athlete if unset. Every data query uses `requireParentAccess(selectedChildId)` — never the parent's own `user.id` for athlete data.

---

## 5. Routes & Navigation

### New routes

| Route | Layout | Access | Purpose |
|---|---|---|---|
| `/parent/accept` | Public (token gate) | Token valid | Accept invite / signup / login |
| `/parent` | Parent layout | `PARENT` | Redirect to dashboard with default child |
| `/parent/dashboard` | Parent layout | `PARENT` | Child stats + this week's schedule |
| `/parent/history` | Parent layout | `PARENT` | Workout history (read-only) |
| `/parent/schedule` | Parent layout | `PARENT` | Full team schedule (read-only) |
| `/parent/shoes` | Parent layout | `PARENT` | Athlete shoes (read-only) |
| `/parent/profile` | Parent layout | `PARENT` | Parent account settings + linked children |

### Parent nav (`parentNav`)

| href | label |
|---|---|
| `/parent/dashboard` | Dashboard |
| `/parent/history` | History |
| `/parent/schedule` | Schedule |
| `/parent/shoes` | Shoes |
| `/parent/profile` | Profile |

No "Log Run" or edit affordances.

### Child switcher

When parent has 2+ linked athletes, show a switcher in `TopBar` (dropdown or segmented control). Switching updates `?child=` and persists `parent_child_id` cookie.

### Invite UI locations

| Location | Who |
|---|---|
| `src/app/(athlete)/profile/page.tsx` — "Parent/guardian access" section | Athlete |
| `src/app/coach/athletes/[id]/page.tsx` — same section | Coach / admin |

Section contents:

- Form: parent email + "Send invite"
- List: active links (parent name, email, linked since) with Revoke
- List: pending invites (email, sent date, expires) with Revoke / Resend

---

## 6. Server Actions

New file: `src/app/actions/parent.ts`

| Action | Who can call | Behavior |
|---|---|---|
| `inviteParent(athleteId, email)` | Athlete (self only), coach/admin | Create token, send email |
| `revokeParentLink(linkId)` | Athlete (own links), coach/admin, parent (own links) | Delete link |
| `revokeParentInvite(tokenId)` | Same as revoke link | Set `revokedAt` |
| `resendParentInvite(tokenId)` | Same as invite | New token, revoke old pending |
| `acceptParentInvite(token, signup?)` | Public (token) | Create user and/or link |
| `removeSelfFromAthlete(athleteId)` | Parent | Delete own link |

Revalidate paths: parent routes, athlete profile, coach athlete page.

---

## 7. UI Reuse

Reuse existing read components where possible:

| Component | Parent usage |
|---|---|
| `LogList` / log row | History page, read-only |
| `ScheduleReadonlyPage` | Schedule page |
| `ShoeCard` | Shoes page without `ShoeActions` or `AddShoeForm` |
| `StatCard`, dashboard schedule snippet | Dashboard |
| `UserAvatar` | Child header showing athlete name + avatar |

Extract or parameterize shared "athlete summary header" (name, avatar, grade badges) for parent child views.

Parent profile page uses existing `AccountSettings` for parent's own email/password; add linked-children list with self-remove.

---

## 8. Edge Cases & Errors

| Scenario | Behavior |
|---|---|
| Invalid / expired / used invite token | "This invite link is invalid or has expired." |
| Email already athlete/coach/admin | "This email is already registered. Use a different email or contact your coach." |
| Duplicate active link | Block invite send silently or show "Already linked" to inviter |
| Athlete deactivated | Parent links remain but queries return no data / show inactive message |
| Parent with no linked children | Empty state on dashboard; prompt to accept an invite |
| Coach invites for athlete on another team | Deny unless coach's team scope includes athlete (same as other coach athlete actions) |

---

## 9. Rate Limiting & Security

- Invite send: 5 per athlete per hour (by athlete ID).
- Accept signup: 10 attempts per IP per 15 minutes (match signup pattern).
- Tokens stored as SHA-256 hash only.
- Invite links single-use (`acceptedAt` set on success).
- Session cookie unchanged; `PARENT` uses same session mechanism as other roles.

---

## 10. Out of Scope (v1)

- Parent notifications (email when athlete logs a run)
- Parent-initiated invites (only athlete/coach/admin send invites)
- Changing athlete profile data
- Viewing coach notes or team-wide athlete lists
- Admin UI to manage all parent links globally (coach athlete page is sufficient)

---

## 11. Implementation Order

1. Schema migration + `PARENT` role in auth (`roleHome`, labels, admin user form if needed)
2. Token helpers + email + server actions (invite, revoke, accept)
3. `/parent/accept` page
4. Parent layout, nav, child switcher, cookie/query child selection
5. Parent dashboard, history, schedule, shoes (read-only)
6. Parent profile (account + linked children)
7. Invite UI on athlete profile and coach athlete page
8. Seed data optional: one sample parent link for dev

---

## 12. Test Plan

- [ ] Athlete sends invite; parent receives email (or dev console log)
- [ ] New parent signs up via link; sees dashboard for that child
- [ ] Existing parent accepts second child's invite; switcher shows both
- [ ] Parent sees history, schedule, shoes; cannot edit or log
- [ ] Parent sees athlete avatar and profile summary; does not see coach notes
- [ ] Athlete revokes parent; parent loses access immediately
- [ ] Coach revokes from athlete page
- [ ] Parent self-removes from profile
- [ ] Expired token rejected after 7 days
- [ ] Invite to email already used by athlete shows error on accept, not on send
- [ ] Rate limit blocks spam invites

# Athlete Signup, Auth & Profile — Design Spec

**Date:** 2026-06-16  
**Status:** Approved  
**Hosting:** Vercel

## Overview

Enable athletes to self-register using a season invite code while keeping the app closed to the public. Add profile picture uploads, forgot-password via email magic link (all user roles), and coach ability to edit athlete email addresses.

## Requirements Summary

| Feature | Decision |
|---|---|
| Access gate | One shared invite code per team/season |
| Signup fields | Name, email, password, grade (7–12), invite code |
| Post-signup assignment | Coach/admin sets gender team and Varsity/JV/Freshman later |
| Code management | Admin only — generate, rotate, enable/disable on Teams page |
| Profile photos | Athletes upload on Profile page; stored in Vercel Blob |
| Forgot password | Email magic link → reset page; all roles (athlete, coach, admin) |
| Email delivery | Resend |
| Coach roster edits | Coaches and admins can edit athlete email addresses |

---

## 1. Data Model

### Team (extend existing model)

Add fields for invite-code signup:

```prisma
signupCodeHash     String?   // bcrypt hash of active code; null until first generate
signupEnabled      Boolean   @default(false)
signupCodeRotatedAt DateTime?
```

- One active code per team at a time.
- Code stored as bcrypt hash (never plaintext in DB).
- Rotation replaces hash immediately; old code stops working.

### User (extend existing model)

```prisma
avatarUrl String? // Vercel Blob public URL
```

### PasswordResetToken (new model)

```prisma
model PasswordResetToken {
  id        String    @id @default(cuid())
  tokenHash String    // SHA-256 hash of raw token
  userId    String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime  // 1 hour from creation
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  @@index([userId])
  @@index([tokenHash])
}
```

Add `passwordResetTokens PasswordResetToken[]` relation on `User`.

**Token policy:** Creating a new reset token invalidates any previous unused token for that user.

---

## 2. Athlete Signup (Invite Code)

### Approach

Store invite code hash on `Team` (Approach 1 from brainstorming). Matches existing Teams & seasons admin UI; minimal schema change.

### Signup flow

1. Athlete visits `/signup` (public).
2. Enters: invite code, full name, email, password, grade (7–12).
3. Server normalizes code (trim, uppercase).
4. Finds teams where `signupEnabled = true` and verifies code against `signupCodeHash`.
5. On match: creates `User` with `role: ATHLETE`, `teamId`, `grade`, `active: true`; `genderTeam` and `teamGroup` remain null.
6. Auto-login via existing session mechanism; redirect to `/dashboard`.

### Validation & errors

| Scenario | User-facing message |
|---|---|
| Invalid code or signup disabled | "Invalid invite code or signup is closed." |
| Duplicate email | "An account with that email already exists. Try logging in." |
| Missing/invalid fields | Field-specific validation messages |

Do not reveal whether a code exists vs signup being disabled.

### Rate limiting

Rate-limit signup attempts by IP: 10 attempts per 15 minutes.

### UI

- `/signup` page matches `/login` visual style (Logo, card layout).
- Login page link: "New athlete? Sign up with your team code."
- Grade dropdown: 7–12.

### Athletes with unassigned group/gender

- Can log workouts and use the app normally.
- Coach views show "Unassigned" for missing `genderTeam` / `teamGroup`.
- Coach/admin updates via existing admin user edit flow.

---

## 3. Admin Invite Code Management

**Location:** Admin → Teams & seasons (`/admin/teams`), on each team card.

### Controls per team

| Control | Behavior |
|---|---|
| Enable signup toggle | Opens/closes registration for that team |
| Generate code | Creates first code if none; shows plaintext once in copyable banner |
| Rotate code | Invalidates old code; shows new plaintext once |
| Status badge | "Signup open" / "Signup closed" |

### Code format

Auto-generated readable code, e.g. `LJXC-A3F9K2`. Minimum 8 characters; hard to guess.

### Team creation

Optional "Enable athlete signup" checkbox on create form. If checked, code is generated on create and shown once.

### Permissions

Admin role only (`requireRole("ADMIN")`).

---

## 4. Profile Pictures

### Scope

- Athletes upload and manage photo from Profile page (`/profile`).
- Not part of signup flow.
- Coaches and admins see photos in roster views; coaches/admins do not upload their own in v1.

### Storage

**Vercel Blob** via `@vercel/blob`:

- `put()` with pathname `avatars/{userId}.{ext}`
- Re-upload overwrites same pathname
- Remove calls `del()` and clears `avatarUrl`
- Env: `BLOB_READ_WRITE_TOKEN` (auto on Vercel when Blob store linked)

**Local dev without token:** Upload UI disabled with message; initials fallback everywhere.

### Upload rules

- Types: JPEG, PNG, WebP
- Max size: 2 MB
- Server-side MIME validation
- Resize to ~256×256 on upload (strip EXIF, reduce storage)

### Display

Shared `<UserAvatar>` component:

- Profile page (large)
- Nav user menu (small circle)
- Coach athlete list and athlete detail page
- Photo if `avatarUrl` set; otherwise initials from name

### Permissions

Only the logged-in user may upload/remove their own avatar (athletes in v1).

---

## 5. Forgot Password (All Roles)

### Flow

1. Login page: "Forgot password?" link.
2. `/forgot-password` — enter email.
3. Always show: "If an account exists for that email, we sent a reset link."
4. If email matches an active user: create `PasswordResetToken`, send email with magic link.
5. Link: `/reset-password?token={rawToken}` (raw token only in URL, hashed in DB).
6. Reset page: new password + confirm password.
7. On success: update `passwordHash`, mark token used, destroy other sessions for user (optional security), create new session, redirect to `roleHome(role)`.

### Email (Resend)

- Package: `resend` (or `@react-email/components` optional for template)
- Env: `RESEND_API_KEY`, `EMAIL_FROM` (e.g. `Lovejoy XC Log <noreply@yourdomain.com>`)
- Dev without key: log reset URL to server console

### Security

- Same response regardless of email existence (no enumeration)
- Rate-limit: 5 requests per IP per 15 minutes
- Token single-use, expires in 1 hour
- Invalid/expired token: "This reset link is invalid or has expired. Request a new one."

### Applies to

All roles: ATHLETE, COACH, ADMIN.

---

## 6. Coach Edits Athlete Email

### Location

Coach → Athlete profile (`/coach/athletes/[id]`) — inline email edit in header card.

### Permissions

- `requireRole("COACH", "ADMIN")`
- Target user must have `role: ATHLETE`
- Admins retain full edit via existing `/admin/users/[id]`

### Server action

- Validate email format; normalize lowercase
- Reject if another user has that email
- Update `User.email`
- No email notification in v1

### UX

- Save with inline success/error feedback
- Athlete sees updated email on profile; login uses new email immediately

---

## 7. Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Existing |
| `AUTH_SECRET` | Existing session signing |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob avatar uploads |
| `RESEND_API_KEY` | Password reset emails |
| `EMAIL_FROM` | Sender address for Resend |
| `NEXT_PUBLIC_APP_URL` | Base URL for magic links (e.g. `https://lovejoyxc.vercel.app`) |

Add all to `.env.example` with comments.

---

## 8. New & Modified Routes / Files (High Level)

### New routes

| Route | Access | Purpose |
|---|---|---|
| `/signup` | Public | Athlete registration |
| `/forgot-password` | Public | Request reset link |
| `/reset-password` | Public (token in query) | Set new password |

### New server actions / modules

- `src/app/signup/actions.ts` — signup + code validation
- `src/app/forgot-password/actions.ts` — request reset
- `src/app/reset-password/actions.ts` — consume token, set password
- `src/app/actions/avatar.ts` — upload/remove avatar
- `src/app/actions/coach.ts` (extend) — update athlete email
- `src/app/actions/admin.ts` (extend) — team signup code CRUD
- `src/lib/email.ts` — Resend wrapper
- `src/lib/rate-limit.ts` — IP rate limiting helper
- `src/lib/invite-code.ts` — generate/verify codes
- `src/components/user-avatar.tsx` — shared avatar display

### Modified

- `prisma/schema.prisma` — Team, User, PasswordResetToken
- `src/app/login/page.tsx`, `login-form.tsx` — links to signup & forgot password
- `src/app/admin/teams/page.tsx`, `team-form.tsx` — signup code UI
- `src/app/(athlete)/profile/page.tsx` — avatar upload
- `src/app/coach/athletes/[id]/page.tsx` — email edit, UserAvatar
- `src/components/nav/user-menu.tsx` — UserAvatar
- `src/app/coach/athletes/page.tsx` — UserAvatar in list

---

## 9. Error Handling Summary

| Scenario | Behavior |
|---|---|
| Invalid/expired reset token | Error on reset page; link to request new |
| Signup brute force | Rate limit by IP |
| Forgot-password spam | Rate limit by IP; generic success message |
| Avatar too large/wrong type | Client + server validation message |
| Blob unavailable in dev | Graceful disable; initials fallback |
| Resend unavailable in dev | Log link to console |

---

## 10. Testing

### Signup

- Valid code → athlete created with correct `teamId`, `grade`, auto-login
- Invalid/disabled code → generic error
- Duplicate email → specific error
- Rotated code → old code fails, new works

### Admin codes

- Generate, rotate, enable/disable toggle
- Plaintext shown only once

### Forgot password

- Request for existing email → token created, email sent (or logged in dev)
- Request for unknown email → same success message, no token
- Valid token → password updated, can login
- Expired/used token → error

### Avatar

- Upload, replace, remove
- UserAvatar initials fallback

### Coach email edit

- Coach updates athlete email; uniqueness enforced
- Athlete login with new email works

### Manual QA

- Signup on mobile
- Profile photo from phone camera
- Coach roster shows avatars
- Full forgot-password flow on Vercel with Resend

---

## 11. Out of Scope (v1)

- Individual one-time invite links
- Coach/admin profile picture upload
- Email notification when coach changes athlete email
- Athlete self-edit of email, grade, or team group
- Signup approval queue (pending accounts)
- School email domain restriction

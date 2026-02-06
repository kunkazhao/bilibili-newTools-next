# Simple User System Design

Date: 2026-02-06
Owner: Codex
Scope: Full-site login, multi-account support, and strict per-user data isolation.

## 1. Goal

Add a minimal but usable user system for internal team usage:
- Multi-account login with username + password.
- Full-site auth guard (all pages require login).
- Strict data isolation by account for all modules (business + config + templates).
- Keep implementation simple: no registration, no reset flow, no captcha.

## 2. Confirmed Requirements

1) Account model
- Internal multi-account usage, no public signup.
- No role split; all accounts have same permissions.
- Login method: username + password.
- Account management is done directly in DB (no account admin page).

2) Session and access
- Every page requires login.
- Remember login for 30 days.
- Keep security simple: no captcha and no login-attempt lock.

3) Isolation and ownership
- Isolation is global: all user-facing data is isolated, including configs/templates.
- Legacy existing data is assigned to the super admin account.
- Super admin is for account bootstrap/maintenance only, not for reading other users' business data.

4) Account lifecycle
- Support account disable only; no physical delete.
- No change-password feature in UI.
- No forgot-password flow.

## 3. Architecture

Use lightweight in-app auth + owner-based filtering:
- New table `app_users` stores account credentials and status.
- Login issues a 30-day JWT token (recommended in HttpOnly cookie).
- Backend auth dependency resolves `current_user_id` for every request.
- All reads/writes enforce `owner_user_id = current_user_id`.

This keeps dependencies low and fits current FastAPI + Supabase style.

## 4. Data Model

### 4.1 New table: `app_users`
Suggested columns:
- `id` (uuid, pk)
- `username` (text, unique, not null)
- `password_hash` (text, not null)
- `is_active` (boolean, default true)
- `is_super_admin` (boolean, default false)
- `created_at`, `updated_at` (timestamptz)
- `last_login_at` (timestamptz, nullable)

Notes:
- Store password hash only (bcrypt recommended).
- Super admin does not bypass data ownership filter.

### 4.2 Add owner key to isolated tables
For all isolated tables, add:
- `owner_user_id` (uuid, not null, indexed)

And enforce:
- FK to `app_users.id`
- Include `owner_user_id` in query indexes where needed.

## 5. Legacy Data Migration

1. Insert default super admin account in DB.
2. Add nullable `owner_user_id` to target tables.
3. Backfill all existing rows to super admin id.
4. Change column to NOT NULL and add indexes.
5. Ensure all new writes always set current `owner_user_id`.

Because no password-change page is planned, changing admin password is done by direct DB update of `password_hash`.

## 6. Backend APIs (Minimum)

- `POST /api/auth/login`
  - Input: `username`, `password`
  - Output: auth token/cookie, basic profile.

- `POST /api/auth/logout`
  - Clear token/cookie.

- `GET /api/auth/me`
  - Return current user profile.

Auth rules:
- All business APIs require auth by default.
- Disabled account is rejected (401/403).

## 7. Frontend Changes (Minimum)

- Add login page (username, password, submit).
- On app bootstrap, call `/api/auth/me` to restore session.
- If not authenticated, redirect to login.
- Add logout action.

Not included:
- Registration page
- Password reset page
- Account admin page
- Password change page

## 8. Security Baseline

- Hash passwords, never store plaintext.
- Enforce auth on all protected endpoints.
- Enforce `owner_user_id` filter on every read/write path.
- Disabled accounts must lose access immediately.

## 9. Acceptance Criteria

1. Unauthenticated access is redirected to login.
2. Two different accounts cannot see each other's data in any module.
3. Legacy data is visible only under super admin account ownership.
4. Disabled account cannot log in or continue using old session.
5. System works without registration/change-password/forgot-password pages.

## 10. Out of Scope (Now)

- Role-based permissions
- Account management UI
- Password change/reset workflows
- Captcha and anti-brute-force logic
- Audit log UI

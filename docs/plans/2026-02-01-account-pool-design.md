# Account Pool Unification Design (Option C)

Date: 2026-02-01
Owner: Codex
Scope: Comment Blue Link, Blue Link Map, Scheme Detail

## Goal
Introduce a single, authoritative account pool and move all Blue Link related pages to read/write against it. Provide new aggregated state endpoints for read-heavy pages while unifying account CRUD behind one API.

## Decision
Option C: Add a dedicated account pool API (`/api/accounts`) and replace existing read endpoints with v2 aggregated endpoints.

## Current State
- Comment Blue Link page reads `/api/comment/blue-links/state`.
- Blue Link Map reads `/api/blue-link-map/state`, but account CRUD uses `/api/comment/accounts`.
- Scheme Detail reads `/api/blue-link-map/state` with optional `product_ids`.
- Result: two account sources and mixed read/write paths.

## Target State (APIs)
### Account Pool (authoritative)
- `GET /api/accounts` -> list accounts (id, name, sort_order, status, created_at, updated_at)
- `POST /api/accounts`
- `PATCH /api/accounts/{id}`
- `DELETE /api/accounts/{id}`

### Aggregated State (read only)
- `GET /api/comment/blue-links/state-v2` -> { accounts, categories, combos }
- `GET /api/blue-link-map/state-v2` -> { accounts, categories, entries }
- `GET /api/blue-link-map/state-v2?product_ids=...` -> scheme detail view

Notes:
- v2 endpoints must source accounts from `/api/accounts`.
- `account_id` foreign keys must remain stable.

## Migration Plan
1. Backend introduces `/api/accounts` and both v2 endpoints. Keep old endpoints for fallback.
2. Data migration: copy existing accounts into new account pool (keep ids unchanged).
3. Frontend switches to v2 endpoints and `/api/accounts` for CRUD.
4. Deprecate old endpoints after a stabilization window.

## Frontend Change List
### Comment Blue Link
- Replace `/api/comment/blue-links/state` with `/api/comment/blue-links/state-v2`.
- Remove any direct dependency on `/api/comment/accounts`.
- Files: `src/components/comment-blue-link/CommentBlueLinkPageContent.tsx`.

### Blue Link Map
- Replace `/api/blue-link-map/state` with `/api/blue-link-map/state-v2`.
- Replace account CRUD calls from `/api/comment/accounts` -> `/api/accounts`.
- Files: `src/components/blue-link-map/BlueLinkMapPageContent.tsx`, `src/components/blue-link-map/BlueLinkMapDialogs.tsx`.

### Scheme Detail
- Replace `/api/blue-link-map/state` with `/api/blue-link-map/state-v2`.
- File: `src/components/schemes/SchemeDetailPageContent.tsx`.

### Cache Keys
- Upgrade local cache keys to avoid mixing old account payloads with new format.

## Risks / Constraints
- Account id mismatch breaks category/combo/entry linkage.
- Old endpoints still in use during transition can cause inconsistent UI.
- Caches may surface stale accounts after migration if not invalidated.

## Verification
- Account CRUD reflected across Blue Link Map + Comment Blue Link + Scheme Detail.
- Blue Link Map: account add -> category add -> entry map works.
- Comment Blue Link: account switch and combo filtering works.
- Scheme Detail: account selector and mappings work for product_ids query.

## Open Questions (Backend)
- Should deleting an account cascade delete categories/entries/combos?
- Are there additional fields needed on account (status, platform, remark)?
- Do v2 endpoints need pagination or filtering options?

# My Account Sync-All Design

**Goal:** Make the ???????? action sync *all* accounts, and display BV ????? in the video cards.

**Scope:**
- Backend: add `/api/my-accounts/sync-all` to batch sync every `comment_accounts` entry using the existing WBI fetcher. Continue even if some accounts fail (missing homepage link, WBI error, etc.), return a summary with per-account results.
- Frontend: button triggers sync-all, then refreshes the current account?s state. Card UI shows BV ? and ???.

**Backend approach:**
- Keep `/api/my-accounts/sync` for single-account use.
- Implement `/api/my-accounts/sync-all` that:
  - loads accounts ordered by `created_at`.
  - for each account, parse `mid` from `homepage_link`, fetch vlist, upsert into `account_videos`.
  - aggregates `added/updated` and per-account result: `{ account_id, name, added, updated, error? }`.
- Stats mapping: add `danmaku` to `stats` using `video_review` or `danmaku` fields from vlist. Keep `reply` for comment count.

**Frontend approach:**
- Add `syncMyAccountVideosAll()` in `myAccountApi`.
- Button now calls sync-all and shows a summary toast.
- After sync-all, call `refresh()` to load current account?s videos.
- Update card UI to include ?BV: BVxxxx? and ??? {count}?.

**Error handling:**
- Sync-all should not fail the entire batch if a single account fails.
- Frontend shows aggregated toast; errors for individual accounts are included in response.

**Testing:**
- Backend route existence test for `/api/my-accounts/sync-all`.
- Frontend view test to render BV/?? text and ensure sync-all API is invoked.

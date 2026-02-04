# My Account Sync-All Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add sync-all behavior for ???????? and show BV ? + ??? on video cards.

**Architecture:** Add a `/api/my-accounts/sync-all` endpoint that iterates over all `comment_accounts` and reuses the existing WBI fetch + upsert pipeline. Frontend triggers sync-all, refreshes current account state, and renders BV/?? fields in the card UI.

**Tech Stack:** FastAPI + Supabase, React 19 + TypeScript, Vitest.

---

### Task 1: Backend route + stats mapping

**Files:**
- Modify: `backend/main.py`
- Test: `backend/tests/test_my_account_routes.py`

**Step 1: Write failing test**

```py
# backend/tests/test_my_account_routes.py
# add assertion for /api/my-accounts/sync-all POST
self.assertTrue(has_route("/api/my-accounts/sync-all", {"POST"}))
```

**Step 2: Run test to verify it fails**

Run: `python backend/tests/test_my_account_routes.py`
Expected: FAIL (route missing)

**Step 3: Implement `/api/my-accounts/sync-all`**

- Iterate `comment_accounts`.
- For each account:
  - Validate `homepage_link` -> `mid`.
  - Fetch vlist via `fetch_account_videos_from_bili`.
  - Upsert into `account_videos`.
  - Track `{account_id, name, added, updated, error?}`.
- Aggregate totals: `added`, `updated`, `failed`.
- Return `{ total_accounts, added, updated, failed, results }`.

**Step 4: Add `danmaku` mapping**

- Update `build_account_video_payload` to include `danmaku` in `stats` from `video_review` or `danmaku` fields.
- Keep `reply` for comment count.

**Step 5: Run test to verify it passes**

Run: `python backend/tests/test_my_account_routes.py`
Expected: PASS

**Step 6: Commit**

```bash
git add backend/main.py backend/tests/test_my_account_routes.py
git commit -m "feat: add my account sync-all endpoint"
```

---

### Task 2: Frontend API + UI updates

**Files:**
- Modify: `src/components/my-account/myAccountApi.ts`
- Modify: `src/components/my-account/types.ts`
- Modify: `src/components/my-account/MyAccountPageContent.tsx`
- Modify: `src/components/my-account/MyAccountPageView.tsx`
- Test: `src/components/my-account/MyAccountPageView.test.tsx`

**Step 1: Write failing test**

```tsx
// src/components/my-account/MyAccountPageView.test.tsx
// render a video with bvid + danmaku and assert BV label & ?? line present
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/my-account/MyAccountPageView.test.tsx`
Expected: FAIL (BV/?? not rendered)

**Step 3: Implement API + UI**

- Add `syncMyAccountVideosAll()` in `myAccountApi`.
- Update `AccountVideo` type to include `stats.danmaku`.
- Update view:
  - show `BV: {bvid}` near title.
  - add `?? {formatNumber(...)}` in stats row.
  - adjust description/label to reflect ?????????
- Update content:
  - call sync-all endpoint.
  - after success call `refresh()` for current account.
  - toast summary (added/updated/failed).

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/my-account/MyAccountPageView.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/my-account
git commit -m "feat: sync all accounts and show bv/danmaku"
```

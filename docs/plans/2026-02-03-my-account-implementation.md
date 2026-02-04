# My Account Tool Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "我的账号" sidebar tool that manages B站账号并抓取最新视频，左侧显示账号信息，右侧展示视频卡片。

**Architecture:** Reuse `comment_accounts` as the account source (add `homepage_link`), add a new `account_videos` table for cached videos, and expose `/api/my-accounts/state` + `/api/my-accounts/sync` endpoints. Frontend adds a new page with a sidebar account list and benchmark-style video cards, plus a sync button.

**Tech Stack:** FastAPI + Supabase, React 19 + TypeScript, Vitest, Tailwind UI components.

> Note: the brainstorming skill recommends a dedicated worktree, but the `using-git-worktrees` skill is disabled in this environment. Proceed in the current workspace.

### Task 1: Add database migration (comment_accounts.homepage_link + account_videos)

**Files:**
- Create: `supabase/migrations/2026_02_03_add_my_account_tables.sql`

**Step 1: Write the migration SQL**

```sql
-- supabase/migrations/2026_02_03_add_my_account_tables.sql
alter table public.comment_accounts
  add column if not exists homepage_link text;

create table if not exists public.account_videos (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.comment_accounts(id) on delete cascade,
  bvid text not null,
  title text,
  link text,
  cover text,
  author text,
  duration integer,
  pub_time timestamptz,
  stats jsonb,
  payload jsonb,
  created_at timestamptz default timezone('utc'::text, now()),
  updated_at timestamptz default timezone('utc'::text, now())
);

create unique index if not exists account_videos_account_bvid_uidx
  on public.account_videos (account_id, bvid);
```

**Step 2: Apply migration**

Run: `mcp__supabase__apply_migration` with name `add_my_account_tables`
Expected: migration applied successfully

**Step 3: Verify schema**

Run (SQL):
```sql
select column_name from information_schema.columns
where table_schema='public' and table_name='comment_accounts' and column_name='homepage_link';

select column_name from information_schema.columns
where table_schema='public' and table_name='account_videos';
```
Expected: `homepage_link` exists and `account_videos` columns listed

**Step 4: Commit**

```bash
git add supabase/migrations/2026_02_03_add_my_account_tables.sql
git commit -m "feat: add my account tables"
```

### Task 2: Backend account model updates + mid parsing helper

**Files:**
- Modify: `backend/main.py`
- Test: `backend/tests/test_my_account_mid.py`

**Step 1: Write failing test for mid parsing**

```py
# backend/tests/test_my_account_mid.py
import sys
from pathlib import Path
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import extract_mid_from_homepage_link

class MidParseTests(unittest.TestCase):
  def test_extracts_mid_from_space_url(self):
    self.assertEqual(extract_mid_from_homepage_link("https://space.bilibili.com/12345"), "12345")

  def test_extracts_mid_from_space_url_with_trailing(self):
    self.assertEqual(extract_mid_from_homepage_link("https://space.bilibili.com/12345/"), "12345")

  def test_extracts_mid_from_plain_number(self):
    self.assertEqual(extract_mid_from_homepage_link("12345"), "12345")

  def test_returns_empty_on_invalid(self):
    self.assertEqual(extract_mid_from_homepage_link("https://example.com/"), "")

if __name__ == "__main__":
  unittest.main()
```

**Step 2: Run test to verify it fails**

Run: `python backend/tests/test_my_account_mid.py`
Expected: FAIL (function not found)

**Step 3: Implement helper + homepage_link support**

In `backend/main.py`:
- Add `homepage_link` to `CommentAccountPayload` and `CommentAccountUpdate` (optional)
- Update `normalize_comment_account` to return `homepage_link`
- Implement `extract_mid_from_homepage_link(link: str) -> str` (regex for `space.bilibili.com/\d+` or plain digits)
- Update `create_comment_account` and `patch_comment_account` to accept `homepage_link` when provided

**Step 4: Run test to verify it passes**

Run: `python backend/tests/test_my_account_mid.py`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/main.py backend/tests/test_my_account_mid.py
git commit -m "feat: add homepage link support and mid parser"
```

### Task 3: Backend WBI fetch + my-account endpoints

**Files:**
- Modify: `backend/main.py`
- Test: `backend/tests/test_my_account_routes.py`

**Step 1: Write failing route test**

```py
# backend/tests/test_my_account_routes.py
import sys
from pathlib import Path
import unittest
from fastapi.routing import APIRoute

sys.path.append(str(Path(__file__).resolve().parents[1]))
from main import app


def has_route(path: str, methods=None) -> bool:
  methods = {m.upper() for m in (methods or {"GET"})}
  for route in app.routes:
    if isinstance(route, APIRoute) and route.path == path:
      route_methods = {m.upper() for m in (route.methods or set())}
      if methods.issubset(route_methods):
        return True
  return False

class MyAccountRouteTests(unittest.TestCase):
  def test_routes_exist(self):
    self.assertTrue(has_route("/api/my-accounts/state", {"GET"}))
    self.assertTrue(has_route("/api/my-accounts/sync", {"POST"}))

if __name__ == "__main__":
  unittest.main()
```

**Step 2: Run test to verify it fails**

Run: `python backend/tests/test_my_account_routes.py`
Expected: FAIL (routes missing)

**Step 3: Implement endpoints**

In `backend/main.py`:
- Add `account_videos` normalization helper
- Add async `fetch_account_videos_from_bili(mid: str)` using WBI signed request to `https://api.bilibili.com/x/space/wbi/arc/search` (order=pubdate, ps=20)
- `GET /api/my-accounts/state?account_id=...`: return `{ accounts, videos }` (videos for selected account ordered by `pub_time desc`)
- `POST /api/my-accounts/sync`:
  - validate `account_id`, read account + homepage_link
  - parse `mid`, error if invalid
  - fetch video list
  - select existing bvids for `account_id`
  - upsert into `account_videos` with on_conflict `(account_id,bvid)`
  - return `{ added, updated, videos }`

**Step 4: Run test to verify it passes**

Run: `python backend/tests/test_my_account_routes.py`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/main.py backend/tests/test_my_account_routes.py
git commit -m "feat: add my account sync endpoints"
```

### Task 4: Frontend types + API client

**Files:**
- Create: `src/components/my-account/types.ts`
- Create: `src/components/my-account/myAccountApi.ts`
- Test: `src/components/my-account/myAccountApi.test.ts`
- Modify: `src/types/account.ts`

**Step 1: Write failing test**

```ts
// src/components/my-account/myAccountApi.test.ts
import { describe, expect, it, vi } from "vitest"
import { apiRequest } from "@/lib/api"
import { fetchMyAccountState, syncMyAccountVideos } from "./myAccountApi"

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }))

describe("myAccountApi", () => {
  it("fetchMyAccountState hits /api/my-accounts/state", async () => {
    await fetchMyAccountState("acc-1")
    expect(apiRequest).toHaveBeenCalledWith("/api/my-accounts/state?account_id=acc-1")
  })

  it("syncMyAccountVideos hits /api/my-accounts/sync", async () => {
    await syncMyAccountVideos("acc-1")
    expect(apiRequest).toHaveBeenCalledWith("/api/my-accounts/sync", {
      method: "POST",
      body: JSON.stringify({ account_id: "acc-1" }),
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/my-account/myAccountApi.test.ts`
Expected: FAIL (module not found)

**Step 3: Implement API + types**

```ts
// src/components/my-account/types.ts
export type AccountVideo = {
  id: string
  account_id: string
  bvid: string
  title?: string | null
  link?: string | null
  cover?: string | null
  author?: string | null
  duration?: number | null
  pub_time?: string | null
  stats?: { view?: number; like?: number; reply?: number } | null
}
```

```ts
// src/components/my-account/myAccountApi.ts
import { apiRequest } from "@/lib/api"
import type { Account } from "@/types/account"
import type { AccountVideo } from "./types"

export const fetchMyAccountState = (accountId: string) =>
  apiRequest<{ accounts: Account[]; videos: AccountVideo[] }>(
    `/api/my-accounts/state?account_id=${encodeURIComponent(accountId)}`
  )

export const syncMyAccountVideos = (accountId: string) =>
  apiRequest<{ added: number; updated: number; videos: AccountVideo[] }>(
    "/api/my-accounts/sync",
    {
      method: "POST",
      body: JSON.stringify({ account_id: accountId }),
    }
  )
```

Update `src/types/account.ts` to include `homepage_link?: string | null`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/my-account/myAccountApi.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/my-account src/types/account.ts
git commit -m "feat: add my account api client"
```

### Task 5: Frontend UI components (view + dialogs + page content)

**Files:**
- Create: `src/components/my-account/MyAccountPageView.tsx`
- Create: `src/components/my-account/MyAccountDialogs.tsx`
- Create: `src/components/my-account/MyAccountPageContent.tsx`
- Test: `src/components/my-account/MyAccountPageView.test.tsx`

**Step 1: Write failing test for view**

```tsx
// src/components/my-account/MyAccountPageView.test.tsx
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import MyAccountPageView from "./MyAccountPageView"

const baseProps = {
  loading: false,
  syncing: false,
  accounts: [],
  currentAccountId: null,
  videos: [],
  videoCountByAccount: new Map(),
  onAccountChange: () => {},
  onOpenAccountManage: () => {},
  onSync: () => {},
}

describe("MyAccountPageView", () => {
  it("renders sync button", () => {
    render(<MyAccountPageView {...baseProps} />)
    expect(screen.getByRole("button", { name: "获取最新视频" })).toBeTruthy()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/my-account/MyAccountPageView.test.tsx`
Expected: FAIL (module not found)

**Step 3: Implement view + dialogs + content**

- `MyAccountPageView.tsx`: two-column layout
  - Left: sidebar list styled like `CommentBlueLinkPageView`
  - Right: top card with “获取最新视频” button + benchmark-style video cards
- `MyAccountDialogs.tsx`: account management modal (name + homepage link, list rows, delete)
- `MyAccountPageContent.tsx`: state, selection, sync button, CRUD for accounts via `/api/comment/accounts` with `homepage_link`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/my-account/MyAccountPageView.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/my-account
git commit -m "feat: add my account UI"
```

### Task 6: Wire navigation + page entry

**Files:**
- Modify: `src/components/AppLayout.tsx`
- Modify: `src/App.tsx`
- Create: `src/components/pages/MyAccountPage.tsx`
- Create: `src/pages/MyAccountPage.tsx`

**Step 1: Update navigation**
- Add "我的账号" to `utilityItems` in `AppLayout.tsx`
- Add new page mapping in `App.tsx` for the new index

**Step 2: Add page wrappers**

```tsx
// src/components/pages/MyAccountPage.tsx
import MyAccountPageContent from "@/components/my-account/MyAccountPageContent"
export default function MyAccountPage() {
  return <MyAccountPageContent />
}
```

```tsx
// src/pages/MyAccountPage.tsx
import MyAccountPage from "@/components/pages/MyAccountPage"
export default MyAccountPage
```

**Step 3: Run tests**

Run: `npm test -- src/components/my-account/MyAccountPageView.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/AppLayout.tsx src/App.tsx src/components/pages/MyAccountPage.tsx src/pages/MyAccountPage.tsx
git commit -m "feat: add my account page navigation"
```

---

Plan complete and saved to `docs/plans/2026-02-03-my-account-implementation.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open a new session with executing-plans, batch execution with checkpoints

Which approach?

# Account Pool Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Switch frontend to the new account pool (`/api/accounts`) and v2 aggregated state endpoints, with cache key upgrades to avoid stale data.

**Architecture:** Introduce small API helper modules (accounts + v2 state fetchers) and reuse them across Blue Link Map, Comment Blue Link, and Scheme Detail. Keep page logic intact while swapping data sources and cache keys.

**Tech Stack:** React 19, TypeScript, Vitest, apiRequest fetch wrapper, localStorage caching.

### Task 1: Add shared account type and API client

**Files:**
- Create: `src/types/account.ts`
- Create: `src/lib/accountsApi.ts`
- Test: `src/lib/accountsApi.test.ts`

**Step 1: Write the failing test**

```ts
// src/lib/accountsApi.test.ts
import { describe, expect, it, vi } from "vitest"
import { apiRequest } from "@/lib/api"
import { createAccount, deleteAccount, fetchAccounts, updateAccount } from "./accountsApi"

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }))

describe("accountsApi", () => {
  it("fetchAccounts calls /api/accounts", async () => {
    await fetchAccounts()
    expect(apiRequest).toHaveBeenCalledWith("/api/accounts")
  })

  it("createAccount uses POST", async () => {
    await createAccount({ name: "Test" })
    expect(apiRequest).toHaveBeenCalledWith("/api/accounts", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    })
  })

  it("updateAccount uses PATCH", async () => {
    await updateAccount("acc-1", { name: "Next" })
    expect(apiRequest).toHaveBeenCalledWith("/api/accounts/acc-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Next" }),
    })
  })

  it("deleteAccount uses DELETE", async () => {
    await deleteAccount("acc-1")
    expect(apiRequest).toHaveBeenCalledWith("/api/accounts/acc-1", {
      method: "DELETE",
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/accountsApi.test.ts`
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**

```ts
// src/types/account.ts
export type Account = {
  id: string
  name: string
  sort_order?: number | null
  status?: string | null
  created_at?: string
  updated_at?: string
}
```

```ts
// src/lib/accountsApi.ts
import { apiRequest } from "@/lib/api"
import type { Account } from "@/types/account"

export const fetchAccounts = () =>
  apiRequest<{ accounts: Account[] }>("/api/accounts")

export const createAccount = (payload: { name: string }) =>
  apiRequest<{ account: Account }>("/api/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  })

export const updateAccount = (id: string, payload: { name: string }) =>
  apiRequest<{ account: Account }>(`/api/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })

export const deleteAccount = (id: string) =>
  apiRequest(`/api/accounts/${id}`, {
    method: "DELETE",
  })
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/accountsApi.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/types/account.ts src/lib/accountsApi.ts src/lib/accountsApi.test.ts
git commit -m "feat: add account pool api"
```

### Task 2: Add Blue Link Map v2 state API helper

**Files:**
- Create: `src/components/blue-link-map/blueLinkMapApi.ts`
- Test: `src/components/blue-link-map/blueLinkMapApi.test.ts`

**Step 1: Write the failing test**

```ts
// src/components/blue-link-map/blueLinkMapApi.test.ts
import { describe, expect, it, vi } from "vitest"
import { apiRequest } from "@/lib/api"
import { fetchBlueLinkMapState } from "./blueLinkMapApi"

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }))

describe("blueLinkMapApi", () => {
  it("uses v2 state endpoint without product ids", async () => {
    await fetchBlueLinkMapState()
    expect(apiRequest).toHaveBeenCalledWith("/api/blue-link-map/state-v2")
  })

  it("adds product_ids when provided", async () => {
    await fetchBlueLinkMapState(["a", "b"])
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/blue-link-map/state-v2?product_ids=a%2Cb"
    )
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/blue-link-map/blueLinkMapApi.test.ts`
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**

```ts
// src/components/blue-link-map/blueLinkMapApi.ts
import { apiRequest } from "@/lib/api"
import type { BlueLinkAccount, BlueLinkCategory, BlueLinkEntry } from "./types"

export const fetchBlueLinkMapState = (productIds?: string[]) => {
  const params = productIds?.length
    ? `?product_ids=${encodeURIComponent(productIds.join(","))}`
    : ""
  return apiRequest<{
    accounts: BlueLinkAccount[]
    categories: BlueLinkCategory[]
    entries: BlueLinkEntry[]
  }>(`/api/blue-link-map/state-v2${params}`)
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/blue-link-map/blueLinkMapApi.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/blue-link-map/blueLinkMapApi.ts src/components/blue-link-map/blueLinkMapApi.test.ts
git commit -m "feat: add blue link map v2 api"
```

### Task 3: Add Comment Blue Link v2 state API helper

**Files:**
- Create: `src/components/comment-blue-link/commentBlueLinkApi.ts`
- Test: `src/components/comment-blue-link/commentBlueLinkApi.test.ts`

**Step 1: Write the failing test**

```ts
// src/components/comment-blue-link/commentBlueLinkApi.test.ts
import { describe, expect, it, vi } from "vitest"
import { apiRequest } from "@/lib/api"
import { fetchCommentBlueLinkState } from "./commentBlueLinkApi"

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }))

describe("commentBlueLinkApi", () => {
  it("uses v2 state endpoint", async () => {
    await fetchCommentBlueLinkState()
    expect(apiRequest).toHaveBeenCalledWith("/api/comment/blue-links/state-v2")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/comment-blue-link/commentBlueLinkApi.test.ts`
Expected: FAIL (module not found).

**Step 3: Write minimal implementation**

```ts
// src/components/comment-blue-link/commentBlueLinkApi.ts
import { apiRequest } from "@/lib/api"
import type { CommentAccount, CommentCategory, CommentCombo } from "./types"

export const fetchCommentBlueLinkState = () =>
  apiRequest<{
    accounts: CommentAccount[]
    categories: CommentCategory[]
    combos: CommentCombo[]
  }>("/api/comment/blue-links/state-v2")
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/comment-blue-link/commentBlueLinkApi.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/comment-blue-link/commentBlueLinkApi.ts src/components/comment-blue-link/commentBlueLinkApi.test.ts
git commit -m "feat: add comment blue link v2 api"
```

### Task 4: Update account types to shared Account

**Files:**
- Modify: `src/components/blue-link-map/types.ts`
- Modify: `src/components/comment-blue-link/types.ts`

**Step 1: Write the failing test**

Use existing tests (type errors will appear on build/test).

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/blue-link-map/blueLinkMapApi.test.ts`
Expected: FAIL if types not updated.

**Step 3: Write minimal implementation**

```ts
// src/components/blue-link-map/types.ts
import type { Account } from "@/types/account"
export type BlueLinkAccount = Account
```

```ts
// src/components/comment-blue-link/types.ts
import type { Account } from "@/types/account"
export type CommentAccount = Account
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/blue-link-map/blueLinkMapApi.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/blue-link-map/types.ts src/components/comment-blue-link/types.ts
git commit -m "refactor: share account type"
```

### Task 5: Switch Blue Link Map page to v2 state + account pool CRUD

**Files:**
- Modify: `src/components/blue-link-map/BlueLinkMapPageContent.tsx`

**Step 1: Write the failing test**

Add/extend a test in `src/components/blue-link-map/BlueLinkMapPageContent.test.tsx`:

```ts
import { describe, it, vi, expect } from "vitest"
import { render, waitFor } from "@testing-library/react"
import BlueLinkMapPageContent from "./BlueLinkMapPageContent"
import { fetchBlueLinkMapState } from "./blueLinkMapApi"

vi.mock("./blueLinkMapApi", () => ({ fetchBlueLinkMapState: vi.fn() }))

it("loads state from v2 endpoint on mount", async () => {
  vi.mocked(fetchBlueLinkMapState).mockResolvedValue({ accounts: [], categories: [], entries: [] })
  render(<BlueLinkMapPageContent />)
  await waitFor(() => expect(fetchBlueLinkMapState).toHaveBeenCalled())
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/blue-link-map/BlueLinkMapPageContent.test.tsx`
Expected: FAIL (file missing or not updated).

**Step 3: Write minimal implementation**

- Replace `/api/blue-link-map/state` calls with `fetchBlueLinkMapState()`.
- Replace account CRUD with `createAccount/updateAccount/deleteAccount` from `@/lib/accountsApi`.
- Update cache keys:
  - `BLUE_LINK_MAP_CACHE_KEY` -> add `_v2`
  - `blue_link_map_category_${id}` -> `blue_link_map_category_v2_${id}`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/blue-link-map/BlueLinkMapPageContent.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/blue-link-map/BlueLinkMapPageContent.tsx src/components/blue-link-map/BlueLinkMapPageContent.test.tsx
git commit -m "feat: use account pool in blue link map"
```

### Task 6: Switch Comment Blue Link page to v2 state + cache key

**Files:**
- Modify: `src/components/comment-blue-link/CommentBlueLinkPageContent.tsx`

**Step 1: Write the failing test**

Update `src/components/comment-blue-link/CommentBlueLinkPageContent.test.tsx` to expect `fetchCommentBlueLinkState` to be called (mocked).

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/comment-blue-link/CommentBlueLinkPageContent.test.tsx`
Expected: FAIL before change.

**Step 3: Write minimal implementation**

- Replace direct `apiRequest("/api/comment/blue-links/state")` with `fetchCommentBlueLinkState()`.
- Update cache key to `comment_blue_link_cache_v2`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/comment-blue-link/CommentBlueLinkPageContent.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/comment-blue-link/CommentBlueLinkPageContent.tsx src/components/comment-blue-link/CommentBlueLinkPageContent.test.tsx
git commit -m "feat: use v2 state in comment blue link"
```

### Task 7: Switch Scheme Detail to v2 state + cache key

**Files:**
- Modify: `src/components/schemes/SchemeDetailPageContent.tsx`

**Step 1: Write the failing test**

Add `src/components/schemes/SchemeDetailPageContent.test.tsx` to verify `fetchBlueLinkMapState` called with product_ids (mocked).

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/schemes/SchemeDetailPageContent.test.tsx`
Expected: FAIL.

**Step 3: Write minimal implementation**

- Use `fetchBlueLinkMapState(productIds)` instead of direct `apiRequest`.
- Update `BLUE_LINK_STATE_CACHE_PREFIX` to v2.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/schemes/SchemeDetailPageContent.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/schemes/SchemeDetailPageContent.tsx src/components/schemes/SchemeDetailPageContent.test.tsx
git commit -m "feat: use v2 blue link state in scheme detail"
```

### Task 8: Final verification

**Step 1: Run focused tests**

```bash
npm test -- src/lib/accountsApi.test.ts src/components/blue-link-map/blueLinkMapApi.test.ts src/components/comment-blue-link/commentBlueLinkApi.test.ts src/components/blue-link-map/BlueLinkMapPageContent.test.tsx src/components/comment-blue-link/CommentBlueLinkPageContent.test.tsx src/components/schemes/SchemeDetailPageContent.test.tsx
```

Expected: PASS

**Step 2: Commit if needed**

```bash
git status -s
```

# End

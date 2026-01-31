# Performance Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce perceived load time on 选品库、蓝链映射、评论蓝链管理 by rendering skeletons sooner, limiting heavy content, and deferring image loading.

**Architecture:** Keep current API/data flow intact. Focus on view-layer rendering strategy: early skeletons, lazy image loading, and truncation for long text when collapsed. Maintain existing chunked rendering logic in page content.

**Tech Stack:** React + TypeScript, Tailwind CSS, Vitest + Testing Library

---

## Notes / Constraints
- Worktree skill is disabled; proceed in current workspace carefully.
- Existing changes in blue-link-map/comment-blue-link are user-owned; do not revert them.
- Follow TDD strictly for each behavior change.

---

### Task 1: Blue Link Map – Add loading skeleton and lazy image loading

**Files:**
- Modify: `src/components/blue-link-map/BlueLinkMapPageView.tsx`
- Modify (tests): `src/components/blue-link-map/BlueLinkMapPageView.test.tsx`

**Step 1: Write the failing test**

Add/extend tests to verify:
- When `loading=true` and no accounts, skeleton layout is rendered (identified by `data-testid="blue-link-map-skeleton"`).
- Card image uses `loading="lazy"` and `decoding="async"`.

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import BlueLinkMapPageView from "./BlueLinkMapPageView"
import type { BlueLinkAccount, BlueLinkCategory, BlueLinkEntry, SourcingItem } from "./types"

const baseProps = {
  loading: false,
  listLoading: false,
  accounts: [] as BlueLinkAccount[],
  entries: [] as BlueLinkEntry[],
  activeAccountId: null,
  activeCategoryId: null,
  searchValue: "",
  accountCategories: [] as BlueLinkCategory[],
  filteredEntries: [] as BlueLinkEntry[],
  visibleEntries: [] as BlueLinkEntry[],
  itemsById: new Map<string, SourcingItem>(),
  entriesCountByAccount: new Map<string, number>(),
  onAccountChange: vi.fn(),
  onCategoryChange: vi.fn(),
  onSearchChange: vi.fn(),
  onOpenAccountManage: vi.fn(),
  onOpenCategoryManage: vi.fn(),
  onOpenImport: vi.fn(),
  onAutoMap: vi.fn(),
  onCopy: vi.fn(),
  onEdit: vi.fn(),
  onPick: vi.fn(),
  onDelete: vi.fn(),
}

describe("BlueLinkMapPageView", () => {
  it("shows skeleton layout when loading and empty", () => {
    render(<BlueLinkMapPageView {...baseProps} loading listLoading />)
    expect(screen.getByTestId("blue-link-map-skeleton")).not.toBeNull()
  })

  it("renders lazy-loaded cover images", () => {
    const entry = {
      id: "e1",
      account_id: "a1",
      category_id: "c1",
      source_link: "https://b23.tv/test",
      product_cover: "https://example.com/cover.jpg",
      product_title: "Test",
      product_price: 199,
      product_id: "p1",
    } as BlueLinkEntry

    const itemsById = new Map<string, SourcingItem>([
      ["p1", { id: "p1", title: "Test", price: 199, cover_url: "https://example.com/cover.jpg" }],
    ])

    const { container } = render(
      <BlueLinkMapPageView
        {...baseProps}
        loading={false}
        listLoading={false}
        accounts={[{ id: "a1", name: "账号" }]}
        activeAccountId="a1"
        accountCategories={[{ id: "c1", account_id: "a1", name: "分类", sort_order: 10 }]}
        activeCategoryId="c1"
        entries={[entry]}
        filteredEntries={[entry]}
        visibleEntries={[entry]}
        itemsById={itemsById}
      />
    )

    const img = container.querySelector("img")
    expect(img?.getAttribute("loading")).toBe("lazy")
    expect(img?.getAttribute("decoding")).toBe("async")
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```
npm test -- src/components/blue-link-map/BlueLinkMapPageView.test.tsx
```
Expected: FAIL because `data-testid` and lazy image attributes are missing.

**Step 3: Write minimal implementation**

Update `BlueLinkMapPageView.tsx`:
- Add skeleton-only layout when `loading && accounts.length === 0`.
- Wrap skeleton root with `data-testid="blue-link-map-skeleton"`.
- Set `loading="lazy"` and `decoding="async"` on cover images.

```tsx
if (loading && accounts.length === 0) {
  return (
    <div data-testid="blue-link-map-skeleton" className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card min-h-[calc(100vh-240px)]">
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 rounded bg-slate-100" />
          <div className="h-5 w-8 rounded bg-slate-100" />
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2">
              <div className="h-4 w-20 rounded bg-slate-100" />
              <div className="h-3 w-8 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </aside>
      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 rounded bg-slate-100" />
            <div className="h-9 w-24 rounded bg-slate-100" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
              <div className="h-4 w-24 rounded bg-slate-100" />
              <div className="mt-3 h-3 w-full rounded bg-slate-100" />
              <div className="mt-2 h-3 w-3/4 rounded bg-slate-100" />
              <div className="mt-4 h-8 w-24 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
```

Update image tag:
```tsx
<img src={cover} alt={title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
```

**Step 4: Run test to verify it passes**

Run:
```
npm test -- src/components/blue-link-map/BlueLinkMapPageView.test.tsx
```
Expected: PASS

**Step 5: Commit**
```
git add src/components/blue-link-map/BlueLinkMapPageView.tsx src/components/blue-link-map/BlueLinkMapPageView.test.tsx

git commit -m "feat(blue-link-map): add loading skeleton and lazy images"
```

---

### Task 2: Comment Blue Link – Render preview text when collapsed

**Files:**
- Modify: `src/components/comment-blue-link/CommentBlueLinkPageView.tsx`
- Create (tests): `src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx`

**Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import CommentBlueLinkPageView from "./CommentBlueLinkPageView"
import type { CommentAccount, CommentCategory, CommentCombo } from "./types"

const baseProps = {
  loading: false,
  listLoading: false,
  accounts: [{ id: "a1", name: "账号" }] as CommentAccount[],
  currentAccountId: "a1",
  currentCategoryId: "__all__",
  allCategoryId: "__all__",
  accountCategories: [] as CommentCategory[],
  filteredCombos: [] as CommentCombo[],
  visibleCombos: [] as CommentCombo[],
  combosCountByAccount: new Map<string, number>(),
  onAccountChange: vi.fn(),
  onCategoryChange: vi.fn(),
  onCopyCombo: vi.fn(),
  onOpenCreate: vi.fn(),
  onOpenEdit: vi.fn(),
  onDelete: vi.fn(),
}

describe("CommentBlueLinkPageView", () => {
  it("renders preview text when collapsed", () => {
    const longText = "A".repeat(500)
    const combo = { id: "c1", name: "组合", account_id: "a1", category_id: "", content: longText, remark: "" } as CommentCombo

    render(
      <CommentBlueLinkPageView
        {...baseProps}
        filteredCombos={[combo]}
        visibleCombos={[combo]}
      />
    )

    expect(screen.queryByText(longText)).toBeNull()
    expect(screen.getByText(/A{100,}/)).not.toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```
npm test -- src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx
```
Expected: FAIL because full text is rendered.

**Step 3: Write minimal implementation**

In `CommentBlueLinkPageView.tsx`:
- Add a preview limit and render preview when not expanded.

```tsx
const PREVIEW_LIMIT = 220
const buildPreview = (text: string) => {
  if (!text) return ""
  if (text.length <= PREVIEW_LIMIT) return text
  return `${text.slice(0, PREVIEW_LIMIT)}...`
}
```

Then inside card render:
```tsx
const rawContent = combo.content || ""
const displayContent = isExpanded ? rawContent : buildPreview(rawContent)
...
{displayContent || "暂无内容"}
```

**Step 4: Run test to verify it passes**

Run:
```
npm test -- src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx
```
Expected: PASS

**Step 5: Commit**
```
git add src/components/comment-blue-link/CommentBlueLinkPageView.tsx src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx

git commit -m "feat(comment-blue-link): render preview text when collapsed"
```

---

### Task 3: Archive – Add lazy image loading to list and card views

**Files:**
- Modify: `src/components/archive/ArchiveListCard.tsx`
- Modify: `src/components/archive/ArchiveProductCard.tsx`
- Modify (tests): `src/components/archive/ArchiveProductCard.test.tsx`
- Create (tests): `src/components/archive/ArchiveListCard.test.tsx`

**Step 1: Write failing tests**

Create `ArchiveListCard.test.tsx`:
```tsx
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import ArchiveListCard from "./ArchiveListCard"

describe("ArchiveListCard", () => {
  it("uses lazy loading for cover image", () => {
    const { container } = render(
      <ArchiveListCard
        id="1"
        title="商品"
        price="100"
        commission="10"
        commissionRate="10%"
        sales30="--"
        comments="--"
        image="https://example.com/cover.jpg"
        shopName="店铺"
        uid="uid"
        source="source"
        blueLink=""
        params={[]}
        remark=""
        missingTips={[]}
        isFocused={false}
        onToggleFocus={vi.fn()}
        onCopyLink={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onDragStart={vi.fn()}
        onDrop={vi.fn()}
      />
    )

    const img = container.querySelector("img")
    expect(img?.getAttribute("loading")).toBe("lazy")
    expect(img?.getAttribute("decoding")).toBe("async")
  })
})
```

Update `ArchiveProductCard.test.tsx`:
```tsx
it("uses lazy loading for cover image", () => {
  const { container } = render(...)
  const img = container.querySelector("img")
  expect(img?.getAttribute("loading")).toBe("lazy")
  expect(img?.getAttribute("decoding")).toBe("async")
})
```

**Step 2: Run tests to verify they fail**

Run:
```
npm test -- src/components/archive/ArchiveListCard.test.tsx
npm test -- src/components/archive/ArchiveProductCard.test.tsx
```
Expected: FAIL because attributes are missing.

**Step 3: Write minimal implementation**

Add attributes to image tags:
```tsx
<img src={image} alt={title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
```

Apply to:
- `ArchiveListCard.tsx`
- `ArchiveProductCard.tsx`

**Step 4: Run tests to verify they pass**

Run:
```
npm test -- src/components/archive/ArchiveListCard.test.tsx
npm test -- src/components/archive/ArchiveProductCard.test.tsx
```
Expected: PASS

**Step 5: Commit**
```
git add src/components/archive/ArchiveListCard.tsx src/components/archive/ArchiveProductCard.tsx src/components/archive/ArchiveListCard.test.tsx src/components/archive/ArchiveProductCard.test.tsx

git commit -m "feat(archive): lazy-load cover images"
```

---

### Task 4: Full test pass

**Step 1: Run all tests**
```
npm test
```
Expected: PASS

**Step 2: Commit (if any pending)**
```
git status -sb
```

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-01-31-performance-optimization-implementation.md`.

Two execution options:

1. **Subagent-Driven (this session)** – I dispatch a fresh subagent per task and review between tasks.
2. **Parallel Session (separate)** – Open a new session and run superpowers:executing-plans to execute task-by-task.

Which approach?

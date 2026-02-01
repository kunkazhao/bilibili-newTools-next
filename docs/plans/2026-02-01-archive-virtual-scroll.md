# Archive Virtual Scroll Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the archive list rendering with fixed-height virtual scrolling to remove sidebar-switch jank.

**Architecture:** Use `react-window` `FixedSizeList` to render only visible cards. Compute list viewport height from the list container’s top offset and window height, with a safe minimum. Add a “load more” row rendered as the last list item when pagination allows, and trigger `onLoadMore` when the user scrolls near the end.

**Tech Stack:** React 19, TypeScript, react-window, Tailwind CSS, Vitest.

---

### Task 1: Add virtual list helpers (TDD)

**Files:**
- Create: `src/components/archive/virtualList.ts`
- Create: `src/components/archive/virtualList.test.ts`

**Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest"
import {
  ARCHIVE_LIST_ROW_HEIGHT,
  getVirtualItemCount,
  isLoadMoreRow,
  resolveListViewportHeight,
} from "./virtualList"

describe("virtual list helpers", () => {
  it("computes item count with load-more row", () => {
    expect(getVirtualItemCount(3, true, false)).toBe(4)
    expect(getVirtualItemCount(3, false, false)).toBe(3)
    expect(getVirtualItemCount(3, true, true)).toBe(3)
  })

  it("identifies the load-more row", () => {
    expect(isLoadMoreRow(3, 3, true, false)).toBe(true)
    expect(isLoadMoreRow(2, 3, true, false)).toBe(false)
    expect(isLoadMoreRow(3, 3, false, false)).toBe(false)
  })

  it("computes a safe viewport height", () => {
    expect(resolveListViewportHeight(900, 200)).toBeGreaterThanOrEqual(320)
    expect(resolveListViewportHeight(500, 400)).toBe(320)
  })

  it("exposes fixed row height", () => {
    expect(ARCHIVE_LIST_ROW_HEIGHT).toBeGreaterThan(300)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/archive/virtualList.test.ts`
Expected: FAIL with “module not found” or missing exports.

**Step 3: Write minimal implementation**

```ts
export const ARCHIVE_LIST_ROW_HEIGHT = 380
const MIN_LIST_HEIGHT = 320
const LIST_BOTTOM_GAP = 24

export const getVirtualItemCount = (
  itemsLength: number,
  hasMore: boolean,
  disableLoadMore: boolean
) => itemsLength + (hasMore && !disableLoadMore ? 1 : 0)

export const isLoadMoreRow = (
  index: number,
  itemsLength: number,
  hasMore: boolean,
  disableLoadMore: boolean
) => hasMore && !disableLoadMore && index === itemsLength

export const resolveListViewportHeight = (
  viewportHeight: number,
  containerTop: number
) => {
  const height = viewportHeight - containerTop - LIST_BOTTOM_GAP
  return Math.max(MIN_LIST_HEIGHT, height)
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/archive/virtualList.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/virtualList.ts src/components/archive/virtualList.test.ts
git commit -m "test: add virtual list helpers"
```

---

### Task 2: Add react-window dependency

**Files:**
- Modify: `package.json`

**Step 1: Install dependency**

Run: `npm install react-window`

**Step 2: Verify lockfile and package.json updated**

Run: `git status`
Expected: `package.json` + lockfile changed.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-window"
```

---

### Task 3: Virtualize Archive list rendering (TDD)

**Files:**
- Modify: `src/components/archive/ArchivePageView.tsx`
- Modify: `src/components/archive/ArchivePageView.test.tsx`

**Step 1: Write failing tests**

Add tests to `ArchivePageView.test.tsx`:

```ts
it("renders load-more row when hasMore", () => {
  render(
    <ArchivePageView
      items={[]}
      categories={[{ id: "cat-1", name: "分类1", sortOrder: 0, count: 0 }]}
      isCategoryLoading={false}
      isListLoading={false}
      isRefreshing={false}
      isUsingCache={false}
      schemes={[]}
      schemeValue=""
      isSchemeLoading={false}
      onSchemeChange={() => {}}
      selectedCategory="cat-1"
      searchValue=""
      onSearchChange={() => {}}
      priceRange={[0, 0]}
      priceBounds={[0, 0]}
      onPriceRangeChange={() => {}}
      hasMore={true}
      isLoadingMore={false}
      onLoadMore={() => {}}
      sortValue="manual"
      onSortChange={() => {}}
      onCreate={() => {}}
      onEdit={() => {}}
      onCopyLink={() => {}}
      onDelete={() => {}}
      onToggleFocus={() => {}}
      onDragStart={() => {}}
      onDrop={() => {}}
      onSelectCategory={() => {}}
      onClearList={() => {}}
      onDownloadImages={() => {}}
      onExport={() => {}}
      onSyncFeishu={() => {}}
      onOpenCategoryManager={() => {}}
      onCloseCategoryManager={() => {}}
      onSaveCategories={() => {}}
      isCategoryManagerOpen={false}
      isPresetFieldsOpen={false}
      onOpenPresetFields={() => {}}
      onClosePresetFields={() => {}}
      onSavePresetFields={() => {}}
      isProductFormOpen={false}
      onCloseProductForm={() => {}}
      onSubmitProductForm={() => {}}
      presetFields={[]}
      importProgressState={{
        status: "idle",
        total: 0,
        processed: 0,
        success: 0,
        failed: 0,
        failures: [],
      }}
      isImportOpen={false}
      onCloseImport={() => {}}
      onCancelImport={() => {}}
      onFixSort={() => {}}
      isFixSortDisabled={false}
      isFixSortSaving={false}
    />
  )

  expect(screen.getByText("加载更多")).toBeInTheDocument()
})
```

Add a test to ensure no load-more row when `hasMore` is false.

**Step 2: Run test to verify it fails**

Run: `npm test -- ArchivePageView.test.tsx`
Expected: FAIL with missing “加载更多”.

**Step 3: Implement virtualization**

- Import `FixedSizeList` and helper utilities from `virtualList.ts`.
- Replace the current `items.map` rendering with a `FixedSizeList`.
- Add `listViewportRef` + `useLayoutEffect` to compute height using `resolveListViewportHeight`.
- Implement `Row` renderer that renders:
  - `ArchiveListCard` for normal rows
  - “加载更多 / 正在加载更多...” row when `isLoadMoreRow(...)`
- Replace the old `IntersectionObserver` logic with `onItemsRendered`:
  - If `visibleStopIndex >= items.length - 1` and `hasMore` and not `isLoadingMore`, call `onLoadMore`.

**Step 4: Run test to verify it passes**

Run: `npm test -- ArchivePageView.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ArchivePageView.tsx src/components/archive/ArchivePageView.test.tsx
git commit -m "feat: virtualize archive list"
```

---

### Task 4: (Optional) Clamp card content to fixed height

**Files:**
- Modify: `src/components/archive/ArchiveListCard.tsx`

**Step 1: Add line clamp for remark / missing**

```tsx
<div className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-600">
  <span className="text-slate-400">{TEXT.remarkLabel}</span>
  <span className="line-clamp-2">{decodeUnicodeEscapes(remark) || "--"}</span>
</div>
{hasMissing ? (
  <div className="mt-2 text-xs text-rose-500 line-clamp-2">
    {TEXT.missingLabel}{normalizedMissingTips.join(TEXT.sep)}
  </div>
) : null}
```

**Step 2: Visual verify**

Run app, open 选品库, confirm cards don’t overflow row height.

**Step 3: Commit**

```bash
git add src/components/archive/ArchiveListCard.tsx
git commit -m "style: clamp archive card text for fixed height"
```

---

### Task 5: Verification

Run:
- `npm test -- src/components/archive/virtualList.test.ts`
- `npm test -- ArchivePageView.test.tsx`

Optional:
- MCP performance trace again to confirm INP improves.

---

**Notes:**
- Fixed row height chosen as `380px` based on current card heights (~360px). Adjust by editing `ARCHIVE_LIST_ROW_HEIGHT` in `virtualList.ts`.
- If you want a different height, change this constant only.

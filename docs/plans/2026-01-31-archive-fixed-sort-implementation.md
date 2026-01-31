# Archive Fixed Sort Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a ¡°¹Ì¶¨ÅÅÐò¡± button for Archive that persists only the currently loaded items¡¯ order, while drag/sort changes stay local and non-persistent.

**Architecture:** ArchivePageContent owns state/logic (ordering, disable conditions, save flow) and passes props to ArchivePageView, which renders the new button. Cache remains for items, but manual order is not persisted locally; sorting persists only when ¡°¹Ì¶¨ÅÅÐò¡± is clicked.

**Tech Stack:** React + TypeScript, Vitest + Testing Library, existing archive API helpers.

> Note: Implementing in the current workspace per user request (no worktree).

---

### Task 1: Add UI tests for the ¡°¹Ì¶¨ÅÅÐò¡± button

**Files:**
- Modify: `src/components/archive/ArchivePageView.test.tsx`

**Step 1: Write the failing tests**

Add tests that:
- renders a ¡°¹Ì¶¨ÅÅÐò¡± button
- calls `onFixSort` when enabled
- is disabled when `isFixSortDisabled` is true

```tsx
it("renders and triggers the fixed sort button when enabled", async () => {
  const onFixSort = vi.fn()
  render(
    <ArchivePageView
      items={[]}
      categories={[{ id: "cat-1", name: "·ÖÀà1", sortOrder: 0, count: 0 }]}
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
      hasMore={false}
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
      onFixSort={onFixSort}
      isFixSortDisabled={false}
      isFixSortSaving={false}
    />
  )

  const button = screen.getByRole("button", { name: "¹Ì¶¨ÅÅÐò" })
  await userEvent.click(button)
  expect(onFixSort).toHaveBeenCalledTimes(1)
})

it("disables the fixed sort button when filters are active", () => {
  render(
    <ArchivePageView
      items={[]}
      categories={[{ id: "cat-1", name: "·ÖÀà1", sortOrder: 0, count: 0 }]}
      isCategoryLoading={false}
      isListLoading={false}
      isRefreshing={false}
      isUsingCache={false}
      schemes={[]}
      schemeValue=""
      isSchemeLoading={false}
      onSchemeChange={() => {}}
      selectedCategory="cat-1"
      searchValue="¹Ø¼ü´Ê"
      onSearchChange={() => {}}
      priceRange={[0, 0]}
      priceBounds={[0, 0]}
      onPriceRangeChange={() => {}}
      hasMore={false}
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
      isFixSortDisabled={true}
      isFixSortSaving={false}
    />
  )

  const button = screen.getByRole("button", { name: "¹Ì¶¨ÅÅÐò" })
  expect(button).toBeDisabled()
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- ArchivePageView.test.tsx`
Expected: FAIL because props/button don¡¯t exist yet.

**Step 3: Implement minimal changes to pass**

(Implemented in Task 2.)

**Step 4: Run test to verify it passes**

Run: `npm run test -- ArchivePageView.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ArchivePageView.test.tsx

git commit -m "test: add fixed sort button coverage"
```

---

### Task 2: Render ¡°¹Ì¶¨ÅÅÐò¡± in ArchivePageView

**Files:**
- Modify: `src/components/archive/ArchivePageView.tsx`

**Step 1: Write the failing test**

Covered by Task 1.

**Step 2: Implement minimal UI**

- Add props: `onFixSort`, `isFixSortDisabled`, `isFixSortSaving`.
- Render a button near the sort selector (same row).
- Button disabled when `isFixSortDisabled || isFixSortSaving`.
- When saving, show loading text (e.g., ¡°±£´æÖÐ...¡±) or loading state on button.

**Step 3: Run test**

Run: `npm run test -- ArchivePageView.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/archive/ArchivePageView.tsx

git commit -m "feat: add fixed sort button to archive view"
```

---

### Task 3: Implement fixed sort logic + remove drag persistence

**Files:**
- Modify: `src/components/archive/ArchivePageContent.tsx`

**Step 1: Write the failing tests**

Add a small pure helper inside `ArchivePageContent.tsx` and export it for tests:
- `buildSortOrderUpdates(items)` returns `{ id, spec }[]` with `_sort_order` applied in current order.

Create a new test file:
- Create: `src/components/archive/ArchivePageContent.test.ts`

```ts
import { describe, expect, it } from "vitest"
import { buildSortOrderUpdates } from "./ArchivePageContent"

describe("buildSortOrderUpdates", () => {
  it("assigns padded sort order strings in current order", () => {
    const items = [
      { id: "a", spec: {} as Record<string, string> },
      { id: "b", spec: { foo: "bar" } as Record<string, string> },
    ]
    const result = buildSortOrderUpdates(items)
    expect(result[0].spec._sort_order).toBe("000010")
    expect(result[1].spec._sort_order).toBe("000020")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm run test -- ArchivePageContent.test.ts`
Expected: FAIL (helper not exported).

**Step 3: Implement minimal logic**

- Export `buildSortOrderUpdates` from `ArchivePageContent.tsx` (pure function using existing `padSortOrder`).
- Add `isFixSortSaving` state and `handleFixSort`.
- Compute disable conditions:
  - `searchValue.trim() !== ""`
  - `schemeFilterId !== ""`
  - price filter active: `safePriceRange` differs from `priceBounds`
- Only allow fixed sort when above are false.
- On fixed sort:
  - build updates for `orderedItems` (current order).
  - update local `items` specs and `manualOrder`.
  - call `updateItem` for each updated item (sequential or Promise.allSettled).
  - toast success/failure (no rollback).
- **Remove** per-item `updateItem` calls from drag/drop; keep local `manualOrder` only and optionally update toast message.
- **Remove** manual order from cache persistence:
  - in `saveItemsCache` do not store manualOrder
  - in `hydrateItemsFromCache` compute manual order from cached items¡¯ `_sort_order` instead of reading cached manualOrder

**Step 4: Run tests**

Run:
- `npm run test -- ArchivePageContent.test.ts`
- `npm run test -- ArchivePageView.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ArchivePageContent.tsx src/components/archive/ArchivePageContent.test.ts

git commit -m "feat: add fixed sort persistence and remove drag save"
```

---

### Task 4: Wire props from ArchivePageContent to ArchivePageView

**Files:**
- Modify: `src/components/archive/ArchivePageContent.tsx`

**Step 1: Write the failing test**

Covered by Task 1 (button props used in render).

**Step 2: Implement minimal wiring**

- Pass `onFixSort`, `isFixSortDisabled`, `isFixSortSaving` to `ArchivePageView`.

**Step 3: Run tests**

Run: `npm run test -- ArchivePageView.test.tsx`
Expected: PASS

**Step 4: Commit**

```bash
git add src/components/archive/ArchivePageContent.tsx

git commit -m "chore: wire fixed sort props to archive view"
```

---

### Task 5: Optional sanity check

**Step 1: Manual check**

- Open Archive page, drag reorder, confirm no network updates.
- Click ¡°¹Ì¶¨ÅÅÐò¡± with no filters, verify PATCH calls for loaded items only.
- Apply search/price/·½°¸É¸Ñ¡ ¡ú button disabled.

---

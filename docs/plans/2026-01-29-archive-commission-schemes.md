# Archive + Commission + Schemes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Archive export/clear, Commission archive (bulk + single), and Schemes category management + skeleton loading, plus enforce computed commission everywhere.

**Architecture:** Add small pure helper modules for export/commission payloads with tests. UI pages call helpers and use shadcn dialogs for confirmation and archive selection. Cache categories in localStorage and refresh silently.

**Tech Stack:** React + TypeScript + Vite + Tailwind + shadcn/ui + xlsx + sonner + localStorage.

---

### Task 1: Add test runner + helper modules (commission + export)

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/archiveExport.ts`
- Create: `src/lib/commissionArchive.ts`
- Create: `tests/archiveExport.test.ts`
- Create: `tests/commissionArchive.test.ts`

**Step 1: Write failing tests (archive export)**

```ts
import { describe, it, expect } from "vitest"
import { buildArchiveExportFilename, buildArchiveExportRows } from "../src/lib/archiveExport"

describe("archive export", () => {
  it("builds filename with category and timestamp", () => {
    const date = new Date("2026-01-29T12:34:56")
    expect(buildArchiveExportFilename("Keyboard", date)).toBe("Keyboard-20260129_123456.xlsx")
  })

  it("builds rows with extracted product id", () => {
    const rows = buildArchiveExportRows([
      {
        uid: "KB001",
        title: "Test",
        price: 10,
        commission: 1,
        commissionRate: 10,
        sales30: 5,
        comments: 2,
        shopName: "Shop",
        standardUrl: "https://item.jd.com/123456.html",
        materialUrl: "",
        originalLink: "",
        image: "",
        specParams: { Color: "Black" },
        isFeatured: true,
      },
    ])
    expect(rows[0][2]).toBe("123456")
  })
})
```

**Step 2: Run tests to verify failure**

Run: `npx vitest run tests/archiveExport.test.ts`
Expected: FAIL (module not found)

**Step 3: Write minimal implementation (archiveExport helpers)**

```ts
export function buildArchiveExportFilename(categoryName: string, date = new Date()) {
  // ...
}

export function buildArchiveExportRows(items: ArchiveExportItem[]) {
  // ...
}
```

**Step 4: Re-run tests to pass**

Run: `npx vitest run tests/archiveExport.test.ts`
Expected: PASS

**Step 5: Write failing tests (commission archive)**

```ts
import { describe, it, expect } from "vitest"
import { buildCommissionArchivePayload, calcCommission } from "../src/lib/commissionArchive"

describe("commission archive", () => {
  it("calcCommission uses price * rate", () => {
    expect(calcCommission(100, 5)).toBe(5)
  })

  it("skips archived items", () => {
    const payload = buildCommissionArchivePayload("cat1", [
      { id: "1", title: "A", price: 10, commissionRate: 10, spec: { _archived: "true" } },
      { id: "2", title: "B", price: 10, commissionRate: 10, spec: {} },
    ])
    expect(payload.items.length).toBe(1)
    expect(payload.items[0].title).toBe("B")
  })
})
```

**Step 6: Run tests to verify failure**

Run: `npx vitest run tests/commissionArchive.test.ts`
Expected: FAIL (module not found)

**Step 7: Write minimal implementation (commissionArchive helpers)**

```ts
export function calcCommission(price: number, rate: number) {
  // ...
}

export function buildCommissionArchivePayload(categoryId: string, items: CommissionArchiveItem[]) {
  // ...
}
```

**Step 8: Re-run tests to pass**

Run: `npx vitest run tests/commissionArchive.test.ts`
Expected: PASS

**Step 9: Commit**

```bash
git add package.json vitest.config.ts src/lib/archiveExport.ts src/lib/commissionArchive.ts tests/archiveExport.test.ts tests/commissionArchive.test.ts
git commit -m "test: add export + commission helper tests"
```

---

### Task 2: ArchivePage clear list + export table

**Files:**
- Modify: `src/pages/ArchivePage.tsx`
- Modify: `src/components/archive/ArchivePageView.tsx`
- Modify: `src/components/archive/ArchiveListCard.tsx` (if needed)

**Step 1: Write failing test (archive export filename already covers name); add one test for clear confirm text**

```ts
import { describe, it, expect } from "vitest"
import { buildClearConfirmMessage } from "../src/lib/archiveExport"

describe("archive clear", () => {
  it("builds confirm message", () => {
    expect(buildClearConfirmMessage(3)).toContain("3")
  })
})
```

**Step 2: Run tests to verify failure**

Run: `npx vitest run tests/archiveExport.test.ts`
Expected: FAIL (function not found)

**Step 3: Implement clear/export logic**
- Add AlertDialog confirm for clear list (use shadcn alert-dialog).
- Use current filtered list (category/search/price) as clear scope.
- Delete via `/api/sourcing/items/{id}` sequentially; on partial failure reload list and show toast.
- Export uses `buildArchiveExportRows` + xlsx; filename uses `buildArchiveExportFilename` with category name ("All" when category=all).

**Step 4: Re-run tests to pass**

Run: `npx vitest run tests/archiveExport.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/ArchivePage.tsx src/components/archive/ArchivePageView.tsx src/lib/archiveExport.ts tests/archiveExport.test.ts
git commit -m "feat: archive clear list + export"
```

---

### Task 3: Commission archive (bulk + single) + category cache

**Files:**
- Modify: `src/pages/CommissionPage.tsx`
- Modify: `src/components/commission/CommissionPageView.tsx`
- Modify: `src/components/commission/CommissionListCard.tsx`
- Create/Modify: `src/components/commission/CommissionArchiveModal.tsx` (if needed)
- Modify: `src/lib/commissionArchive.ts`

**Step 1: Write failing test (archive payload already in Task 1)**

Run: `npx vitest run tests/commissionArchive.test.ts`
Expected: FAIL if not already

**Step 2: Implement UI + logic**
- Page init: silently load categories (cache first, then async refresh).
- Add archive dialog with category select (use cached categories); no loading state.
- Bulk archive button archives ALL items, skipping ones with `spec._archived === "true"`.
- Single item archive button archives that item; on success set `spec._archived = "true"` and disable button + label "Archived".
- Archive payload must include `spec._featured` and `spec._promo_link`.

**Step 3: Re-run tests**

Run: `npx vitest run tests/commissionArchive.test.ts`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pages/CommissionPage.tsx src/components/commission/CommissionPageView.tsx src/components/commission/CommissionListCard.tsx src/lib/commissionArchive.ts tests/commissionArchive.test.ts
if (Test-Path src/components/commission/CommissionArchiveModal.tsx) { git add src/components/commission/CommissionArchiveModal.tsx }
git commit -m "feat: commission archive (bulk + single)"
```

---

### Task 4: Enforce computed commission everywhere

**Files:**
- Modify: `src/components/archive/ProductFormModal.tsx`
- Modify: `src/lib/commissionArchive.ts`
- (Verify) `src/components/commission/CommissionEditModal.tsx` already read-only

**Step 1: Write failing test**

```ts
import { describe, it, expect } from "vitest"
import { calcCommission } from "../src/lib/commissionArchive"

describe("commission calc", () => {
  it("rounds to 2 decimals", () => {
    expect(calcCommission(19.9, 2)).toBe(0.398)
  })
})
```

**Step 2: Run test to verify failure**

Run: `npx vitest run tests/commissionArchive.test.ts`
Expected: FAIL if rounding behavior not implemented

**Step 3: Implement**
- In ProductFormModal: compute commission = price * rate; render commission input as read-only.
- Ensure save uses computed commission value.

**Step 4: Re-run tests**

Run: `npx vitest run tests/commissionArchive.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ProductFormModal.tsx src/lib/commissionArchive.ts tests/commissionArchive.test.ts
git commit -m "feat: enforce computed commission"
```

---

### Task 5: Schemes page category manager + skeleton + async loading

**Files:**
- Modify: `src/pages/SchemesPage.tsx`
- Modify: `src/components/archive/CategoryManagerModal.tsx` (only if needed)
- Modify: `src/components/Skeleton.tsx` (only if needed)

**Step 1: Write failing test (helper for active category selection)**

```ts
import { describe, it, expect } from "vitest"
import { pickActiveCategoryId } from "../src/lib/archiveExport"

describe("schemes category", () => {
  it("picks first category when active missing", () => {
    expect(pickActiveCategoryId([], "x")).toBe("")
    expect(pickActiveCategoryId([{ id: "a" }], "x")).toBe("a")
  })
})
```

**Step 2: Run tests to verify failure**

Run: `npx vitest run tests/archiveExport.test.ts`
Expected: FAIL (function missing)

**Step 3: Implement**
- Add CategoryManagerModal button (reuse archive modal); save via create/update/delete category APIs.
- Keep current layout (no stats).
- Add skeletons for category list + scheme cards on first load when cache empty.
- Keep cache-first render and async refresh.

**Step 4: Re-run tests to pass**

Run: `npx vitest run tests/archiveExport.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/SchemesPage.tsx src/lib/archiveExport.ts tests/archiveExport.test.ts
if (Test-Path src/components/archive/CategoryManagerModal.tsx) { git add src/components/archive/CategoryManagerModal.tsx }
git commit -m "feat: schemes category manager + skeleton"
```

---

### Task 6: Manual verification

**Step 1: Run dev server**

Run: `npm run dev`

**Step 2: Verify ArchivePage**
- Clear list shows confirm dialog, deletes filtered items.
- Export downloads `Category-YYYYMMDD_HHMMSS.xlsx` with expected columns.

**Step 3: Verify CommissionPage**
- Top Archive archives all non-archived items.
- Single item archive changes button to disabled "Archived".
- Commission field read-only and computed.

**Step 4: Verify SchemesPage**
- Initial load shows skeletons when cache empty.
- Category manager opens and persists changes.
- New scheme validation: name + category required.

**Step 5: Commit manual verification note**

```bash
git status -sb
```

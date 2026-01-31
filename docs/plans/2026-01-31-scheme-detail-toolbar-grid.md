# Scheme Detail Toolbar & Sidebar Grid Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move export/Feishu actions into the scheme detail toolbar, remove reset/clear filter controls and download-images action, and lay out the right sidebar as a 2x3 grid matching the reference.

**Architecture:** Update `SchemeDetailToolbar` to include export/Feishu buttons and remove filter reset/clear UI. Restructure `SchemeDetailSidebar` into a 3-column grid with 6 cards (image, blue link, comment reply, title, intro, vote). Remove the download-images action from props and wiring. Keep logic intact; only UI/prop wiring changes.

**Tech Stack:** React + TypeScript, shadcn/ui, lucide-react, vitest/testing-library.

---

### Task 1: Toolbar behavior test (TDD)

**Files:**
- Create: `src/components/schemes/SchemeDetailToolbar.test.tsx`

**Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom
import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import SchemeDetailToolbar from "./SchemeDetailToolbar"

describe("SchemeDetailToolbar", () => {
  it("shows export/feishu actions and hides reset/clear filter", () => {
    render(
      <SchemeDetailToolbar
        priceMin=""
        priceMax=""
        sortValue="manual"
        onPriceMinChange={() => {}}
        onPriceMaxChange={() => {}}
        onSortChange={() => {}}
        onClearItems={() => {}}
        onOpenPicker={() => {}}
        onExport={() => {}}
        onOpenFeishu={() => {}}
      />
    )

    expect(screen.getByRole("button", { name: "导出Excel" })).not.toBeNull()
    expect(screen.getByRole("button", { name: "写入飞书表格" })).not.toBeNull()
    expect(screen.queryByRole("button", { name: "重置筛选" })).toBeNull()
    expect(screen.queryByRole("button", { name: "清空筛选" })).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/schemes/SchemeDetailToolbar.test.tsx`
Expected: FAIL because toolbar doesn’t render new actions yet.

---

### Task 2: Update toolbar props + layout

**Files:**
- Modify: `src/components/schemes/SchemeDetailToolbar.tsx`
- Modify: `src/components/schemes/SchemeDetailPageView.tsx`
- Modify: `src/components/schemes/SchemeDetailPageContent.tsx`
- Modify: `src/components/schemes/SchemeDetailPageView.test.tsx`

**Step 1: Implement minimal changes**
- Add `onExport` and `onOpenFeishu` props to toolbar types.
- Remove `onResetPrice` and `onClearFiltered` props and buttons.
- Place `导出Excel` + `写入飞书表格` in toolbar (left/top area) per reference.

**Step 2: Run toolbar test**

Run: `npx vitest run src/components/schemes/SchemeDetailToolbar.test.tsx`
Expected: PASS

---

### Task 3: Sidebar grid + remove download images action

**Files:**
- Modify: `src/components/schemes/SchemeDetailSidebar.tsx`
- Modify: `src/components/schemes/SchemeDetailPageView.tsx`
- Modify: `src/components/schemes/SchemeDetailPageContent.tsx`

**Step 1: Restructure sidebar layout**
- Change container to `grid` with `lg:grid-cols-3` (2 rows total).
- Order cards: image, blue link, comment reply, title, intro, vote.
- Split copywriting into 3 separate cards (title/intro/vote).

**Step 2: Remove download-images action**
- Remove `onDownloadImages` from sidebar props and wiring.
- Remove `downloadImages` usage in page content.

**Step 3: Run affected tests**

Run: `npm test`
Expected: PASS

---

### Task 4: Commit

```bash
git add src/components/schemes/SchemeDetailToolbar.tsx \
  src/components/schemes/SchemeDetailToolbar.test.tsx \
  src/components/schemes/SchemeDetailSidebar.tsx \
  src/components/schemes/SchemeDetailPageView.tsx \
  src/components/schemes/SchemeDetailPageView.test.tsx \
  src/components/schemes/SchemeDetailPageContent.tsx

git commit -m "feat: update scheme detail toolbar and sidebar grid"
```

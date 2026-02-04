# Archive Add-to-Scheme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add “加入方案” action in 选品库 to append a source-item reference into a chosen scheme, while keeping scheme items fully synced with source item updates.

**Architecture:** Reuse existing archive schemes state and UI components to add a small scheme-picker dialog. On confirm, patch `/api/schemes/{id}` with items that only contain `id`/`source_id` to avoid snapshotting fields. Update scheme list cache and scheme-filter cache. In scheme detail, render items by merging latest source item data.

**Tech Stack:** React + TypeScript + Vite, shadcn/ui Dialog + Select, existing `apiRequest` helper, Vitest for tests.

---

### Task 1: Add scheme picker UI + add-to-scheme action in Archive Page

**Files:**
- Modify: `src/components/archive/ArchiveListCard.tsx`
- Modify: `src/components/archive/ArchivePageView.tsx`
- Modify: `src/components/archive/ArchivePageContent.tsx`
- Test: `src/components/archive/ArchivePageView.test.tsx`

**Step 1: Write failing test (View)**
Add a test in `ArchivePageView.test.tsx` that:
- Renders `ArchivePageView` with one card
- Confirms a “加入方案” button is present (text)
- Clicks it and expects `onAddToScheme` to be called with that item id

```tsx
it("calls onAddToScheme when clicking join scheme", () => {
  const onAddToScheme = vi.fn()
  render(
    <ArchivePageView
      ...
      onAddToScheme={onAddToScheme}
      items={[{ id: "item-1", title: "T", ... }]} // minimal props
    />
  )
  fireEvent.click(screen.getByText("加入方案"))
  expect(onAddToScheme).toHaveBeenCalledWith("item-1")
})
```

**Step 2: Run test to verify it fails**
Run: `npm.cmd test -- ArchivePageView.test.tsx`
Expected: FAIL (button / prop missing)

**Step 3: Minimal implementation (View + Card)**
- `ArchiveListCard.tsx`: add a new Button in the action group (right top) with text “加入方案”; call a new `onAddToScheme` prop.
- `ArchivePageView.tsx`: accept `onAddToScheme` prop and pass into card.

**Step 4: Run test to verify it passes**
Run: `npm.cmd test -- ArchivePageView.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/components/archive/ArchiveListCard.tsx src/components/archive/ArchivePageView.tsx src/components/archive/ArchivePageView.test.tsx
git commit -m "feat: add join scheme button in archive cards"
```

---

### Task 2: Scheme picker dialog + add-to-scheme data flow

**Files:**
- Modify: `src/components/archive/ArchivePageContent.tsx`
- Test: `src/components/archive/ArchivePageContent.test.tsx`

**Step 1: Write failing test (logic)**
Add a test in `ArchivePageContent.test.tsx` for a new helper:

```tsx
import { buildSchemeItemReference } from "./ArchivePageContent"

it("builds scheme item reference without snapshot", () => {
  const item = { id: "item-1", title: "T", spec: { a: "1" } }
  const ref = buildSchemeItemReference(item)
  expect(ref).toEqual({ id: "item-1", source_id: "item-1" })
})
```

**Step 2: Run test to verify it fails**
Run: `npm.cmd test -- ArchivePageContent.test.ts`
Expected: FAIL (function missing)

**Step 3: Minimal implementation (helper + dialog state)**
- Add `buildSchemeItemReference` helper (only `{ id, source_id }`).
- Add dialog state: `schemeJoinOpen`, `schemeJoinItemId`, `schemeJoinSchemeId`.
- On “加入方案” click: open dialog; compute default selected scheme as first visible scheme (filtered by category). If no schemes, show empty state + disable confirm.
- On confirm: patch `/api/schemes/{id}` with `items = existing + [ref]` (dedupe by id/source_id). Use `apiRequest`.
- Update local `schemes` state, invalidate cache for that scheme, and if currently filtering that scheme, reload scheme items.

**Step 4: Run test to verify it passes**
Run: `npm.cmd test -- ArchivePageContent.test.ts`
Expected: PASS

**Step 5: Commit**
```bash
git add src/components/archive/ArchivePageContent.tsx src/components/archive/ArchivePageContent.test.ts
git commit -m "feat: add join scheme dialog and patch logic"
```

---

### Task 3: Scheme detail uses latest source items for display

**Files:**
- Modify: `src/components/schemes/SchemeDetailPageContent.tsx`
- Test: `src/components/schemes/SchemeDetailPageContent.test.tsx`

**Step 1: Write failing test (merge)**
Add a test for a helper `mergeSchemeItemWithSource`:

```tsx
import { mergeSchemeItemWithSource } from "./SchemeDetailPageContent"

it("prefers source item fields for display", () => {
  const schemeItem = { id: "item-1", title: "old", price: 1 }
  const sourceItem = { id: "item-1", title: "new", price: 2 }
  expect(mergeSchemeItemWithSource(schemeItem, sourceItem).title).toBe("new")
})
```

**Step 2: Run test to verify it fails**
Run: `npm.cmd test -- SchemeDetailPageContent.test.tsx`
Expected: FAIL

**Step 3: Minimal implementation**
- Add helper `mergeSchemeItemWithSource` and use it when rendering items (before passing to list) and for any price/commission display calculations.
- Ensure editing still uses `source_id || id` and pulls latest `sourceItems` as base.

**Step 4: Run test to verify it passes**
Run: `npm.cmd test -- SchemeDetailPageContent.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add src/components/schemes/SchemeDetailPageContent.tsx src/components/schemes/SchemeDetailPageContent.test.tsx
git commit -m "feat: render scheme items from latest source data"
```

---

### Task 4: Verification

**Step 1: Run archive tests**
Run: `npm.cmd test -- ArchivePageView.test.tsx`

**Step 2: Run scheme detail tests**
Run: `npm.cmd test -- SchemeDetailPageContent.test.tsx`

---

## Notes
- No snapshot fields are stored in scheme items; only `{ id, source_id }`.
- If there are no schemes available, dialog confirm is disabled.
- Default selection = first visible scheme.


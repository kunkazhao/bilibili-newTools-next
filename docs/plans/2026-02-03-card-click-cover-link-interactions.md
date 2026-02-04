# Card Click + Cover Click Interactions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add consistent card-click (open link) behavior across three pages and cover-click (change cover) behavior only in the Archive page.

**Architecture:** Add `onCardClick`/`onCoverClick` props to card components and wire them from page containers. Use `ProductFormModal` with a new `autoOpenCoverPicker` prop to reuse the existing cover upload flow. Block propagation from buttons/icons to avoid accidental link opens.

**Tech Stack:** React + TypeScript, Vitest/Jest-style component tests (`npm test -- <file>`).

> **Note:** Per user request, do NOT use git worktrees for this change.

---

### Task 1: ProductFormModal auto-open cover picker

**Files:**
- Modify: `src/components/archive/ProductFormModal.test.tsx`
- Modify: `src/components/archive/ProductFormModal.tsx`

**Step 1: Write the failing test**

```tsx
it('auto-opens cover picker when requested', () => {
  const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
  render(
    <ProductFormModal
      open
      onOpenChange={() => {}}
      onSuccess={() => {}}
      item={buildArchiveItem()}
      autoOpenCoverPicker
    />
  );
  expect(clickSpy).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/archive/ProductFormModal.test.tsx`
Expected: FAIL (autoOpenCoverPicker not implemented).

**Step 3: Write minimal implementation**

```tsx
export function ProductFormModal({ autoOpenCoverPicker, open, ... }: Props) {
  useEffect(() => {
    if (open && autoOpenCoverPicker) {
      coverInputRef.current?.click();
    }
  }, [open, autoOpenCoverPicker]);
  // ...
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/archive/ProductFormModal.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ProductFormModal.test.tsx src/components/archive/ProductFormModal.tsx
git commit -m "feat: allow modal to auto-open cover picker"
```

---

### Task 2: Archive cards ? cover click + card click

**Files:**
- Modify: `src/components/archive/ArchiveListCard.test.tsx`
- Modify: `src/components/archive/ArchiveListCard.tsx`
- Modify: `src/components/archive/ArchivePageView.tsx`

**Step 1: Write the failing test**

```tsx
it('calls onCoverClick when cover is clicked', () => {
  const onCoverClick = vi.fn();
  render(<ArchiveListCard item={buildArchiveItem()} onCoverClick={onCoverClick} />);
  fireEvent.click(screen.getByTestId('archive-card-cover'));
  expect(onCoverClick).toHaveBeenCalled();
});

it('calls onCardClick when card body clicked', () => {
  const onCardClick = vi.fn();
  render(<ArchiveListCard item={buildArchiveItem()} onCardClick={onCardClick} />);
  fireEvent.click(screen.getByTestId('archive-card-body'));
  expect(onCardClick).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/archive/ArchiveListCard.test.tsx`
Expected: FAIL (handlers not wired / test ids missing).

**Step 3: Write minimal implementation**

- Add optional props `onCoverClick?: () => void`, `onCardClick?: () => void`.
- Add `data-testid` to cover and card body containers.
- Add `onClick` for cover, with `event.stopPropagation()`.
- Add `onClick` for card body that calls `onCardClick`.
- Ensure icon/button elements call `event.stopPropagation()`.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/archive/ArchiveListCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ArchiveListCard.test.tsx src/components/archive/ArchiveListCard.tsx src/components/archive/ArchivePageView.tsx
git commit -m "feat: archive card cover click and card click"
```

---

### Task 3: Scheme detail list ? card click

**Files:**
- Modify: `src/components/schemes/SchemeDetailProductList.test.tsx`
- Modify: `src/components/schemes/SchemeDetailProductList.tsx`
- Modify: `src/components/schemes/SchemeDetailPageContent.tsx`

**Step 1: Write the failing test**

```tsx
it('calls onCardClick when list card clicked', () => {
  const onCardClick = vi.fn();
  render(<SchemeDetailProductList items={[buildSchemeItem()]} onCardClick={onCardClick} />);
  fireEvent.click(screen.getByTestId('scheme-detail-card'));
  expect(onCardClick).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/schemes/SchemeDetailProductList.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

- Add optional prop `onCardClick?: (item) => void`.
- Add `data-testid` to card container and call `onCardClick(item)`.
- In `SchemeDetailPageContent.tsx`, pass handler that opens the link in new tab and does nothing if missing.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/schemes/SchemeDetailProductList.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/schemes/SchemeDetailProductList.test.tsx src/components/schemes/SchemeDetailProductList.tsx src/components/schemes/SchemeDetailPageContent.tsx
git commit -m "feat: scheme detail card click opens link"
```

---

### Task 4: Commission list ? card click

**Files:**
- Modify: `src/components/commission/CommissionListCard.test.tsx`
- Modify: `src/components/commission/CommissionListCard.tsx`
- Modify: `src/components/commission/CommissionPageContent.tsx`

**Step 1: Write the failing test**

```tsx
it('calls onCardClick when commission card clicked', () => {
  const onCardClick = vi.fn();
  render(<CommissionListCard item={buildCommissionItem()} onCardClick={onCardClick} />);
  fireEvent.click(screen.getByTestId('commission-card'));
  expect(onCardClick).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/commission/CommissionListCard.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

- Add optional prop `onCardClick?: () => void`.
- Add `data-testid` to card container and call `onCardClick`.
- In `CommissionPageContent.tsx`, resolve link from spec (`_promo_link` then `_source_link`), open in new tab, no-op if missing.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/commission/CommissionListCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/commission/CommissionListCard.test.tsx src/components/commission/CommissionListCard.tsx src/components/commission/CommissionPageContent.tsx
git commit -m "feat: commission card click opens link"
```

---

## Verification

- Run focused tests in each task as noted.
- Optional: run `npm test` to ensure no regressions.


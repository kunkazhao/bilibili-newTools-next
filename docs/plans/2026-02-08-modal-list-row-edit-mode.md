# Modal List Row Edit Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Unify all `.modal-list-row` dialogs to support a consistent normal/edit mode interaction (row click selects; pencil enters edit; delete deletes; confirm/cancel in edit mode).

**Architecture:** Keep edit state in each dialog parent to enforce single-row editing. `EditableListRow` becomes a pure presentational component that switches view/edit based on props and exposes edit/delete/confirm/cancel callbacks. Dialogs own state, selection, and update logic.

**Tech Stack:** React + TypeScript, Radix UI, Lucide icons, Vitest + Testing Library.

---

### Task 1: Update `EditableListRow` contract + tests

**Files:**
- Modify: `src/components/ui/editable-list-row.tsx`
- Modify: `src/components/ui/editable-list-row.test.tsx`

**Step 1: Write the failing test**
- Use existing tests in `editable-list-row.test.tsx` that assert:
  - View mode shows Edit/Delete icons with `aria-label` "Edit item" / "Delete item".
  - Edit mode shows Confirm/Cancel icons with `aria-label` "Confirm edit" / "Cancel edit".

**Step 2: Run test to verify it fails**
Run: `npm test src/components/ui/editable-list-row.test.tsx`
Expected: FAIL because component doesn¡¯t accept the new props or render the icons.

**Step 3: Write minimal implementation**
- Replace old API with new props:
  - `viewContent`, `editContent`, `editing`, `onEdit`, `onDelete`, `onConfirm`, `onCancel`.
  - Keep drag handle support.
  - Render pencil/trash in view mode; confirm/cancel in edit mode.
  - Allow optional custom aria-labels if passed.

**Step 4: Run test to verify it passes**
Run: `npm test src/components/ui/editable-list-row.test.tsx`
Expected: PASS.

**Step 5: Commit**
`git add src/components/ui/editable-list-row.tsx src/components/ui/editable-list-row.test.tsx`
`git commit -m "feat: update editable list row for view/edit modes"`

---

### Task 2: Category Manager modal edit mode

**Files:**
- Modify: `src/components/archive/CategoryManagerModal.tsx`
- Modify: `src/components/archive/CategoryManagerModal.test.tsx`

**Step 1: Write the failing test**
- Use existing test that clicks `Edit parent category` and expects confirm/cancel buttons.

**Step 2: Run test to verify it fails**
Run: `npm test src/components/archive/CategoryManagerModal.test.tsx`
Expected: FAIL because edit icon isn¡¯t rendered.

**Step 3: Write minimal implementation**
- Add `editingParentId` / `editingChildId` state.
- Row click selects parent; pencil toggles edit state; delete unchanged.
- Edit state renders inputs + confirm/cancel icons.

**Step 4: Run test to verify it passes**
Run: `npm test src/components/archive/CategoryManagerModal.test.tsx`
Expected: PASS.

**Step 5: Commit**
`git add src/components/archive/CategoryManagerModal.tsx src/components/archive/CategoryManagerModal.test.tsx`
`git commit -m "feat: add edit mode toggle to category manager rows"`

---

### Task 3: Apply edit mode to remaining dialogs

**Files:**
- Modify: `src/components/archive/PresetFieldsModal.tsx`
- Modify: `src/components/archive/PresetFieldsModal.test.tsx` (if needed)
- Modify: `src/components/benchmark/BenchmarkDialogs.tsx`
- Modify: `src/components/my-account/MyAccountDialogs.tsx`
- Modify: `src/components/my-account/MyAccountDialogs.test.tsx`
- Modify: `src/components/blue-link-map/BlueLinkMapDialogs.tsx`

**Step 1: Write the failing tests (if needed)**
- Add/adjust tests to assert edit/delete/confirm/cancel presence and row click behavior.

**Step 2: Run tests to verify failures**
Run focused tests for each changed dialog.

**Step 3: Write minimal implementation**
- Add `editingId` state per dialog.
- Use `EditableListRow` with `viewContent` / `editContent`.
- Ensure row click is preserved for selection where applicable.

**Step 4: Run tests to verify pass**
Run affected tests.

**Step 5: Commit**
`git add src/components/archive/PresetFieldsModal.tsx src/components/benchmark/BenchmarkDialogs.tsx src/components/my-account/MyAccountDialogs.tsx src/components/blue-link-map/BlueLinkMapDialogs.tsx`
`git commit -m "feat: unify modal list rows with edit mode behavior"`

---

### Task 4: Full test sweep (targeted)

**Files:**
- No code changes expected.

**Step 1: Run tests**
Run: `npm test src/components/ui/editable-list-row.test.tsx src/components/archive/CategoryManagerModal.test.tsx src/components/my-account/MyAccountDialogs.test.tsx`
Expected: PASS.

**Step 2: Commit**
If no changes, skip.

---

Plan complete.

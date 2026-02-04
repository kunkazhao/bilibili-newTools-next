# JD/TB Dual Metrics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Taobao metrics alongside JD metrics for sourcing items, update parsing/UI, and persist dual metrics while keeping legacy JD fields intact.

**Architecture:** Extend item payloads with `jd_*` and `tb_*` fields, compute TB commission client-side, and render dual rows in list cards. Backend Taobao details response includes 30-day sales and normalization ensures fallbacks to legacy fields.

**Tech Stack:** React + TypeScript (Vite), Vitest/RTL, FastAPI backend (Python), Supabase SQL migrations.

### Task 1: ProductFormModal JD/TB parsing UI + fields

**Files:**
- Modify: `src/components/archive/ProductFormModal.test.tsx`
- Modify: `src/components/archive/ProductFormModal.tsx`

**Step 1: Write the failing test**

```tsx
it("parses taobao link and fills TB metrics", async () => {
  // assert TB price/commission rate/sales are filled after Taobao parse
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/archive/ProductFormModal.test.tsx -w`
Expected: FAIL (missing TB fields or parse button wiring)

**Step 3: Write minimal implementation**

- Add TB metrics inputs and computed TB commission display
- Wire Taobao parse button to `handleParseTaobao`
- Surface inline errors for Taobao link field

**Step 4: Run test to verify it passes**

Run: `npm test src/components/archive/ProductFormModal.test.tsx -w`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ProductFormModal.tsx src/components/archive/ProductFormModal.test.tsx
git commit -m "feat: add taobao metrics to product form"
```

### Task 2: Archive payload + list mapping for JD/TB metrics

**Files:**
- Modify: `src/components/archive/ArchivePageContent.test.tsx` (create if missing)
- Modify: `src/components/archive/ArchivePageContent.tsx`

**Step 1: Write the failing test**

```tsx
it("builds update payload with jd/tb metrics", () => {
  // expect jd_* mirrors legacy and tb_* computed
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/archive/ArchivePageContent.test.tsx -w`
Expected: FAIL (payload helper missing)

**Step 3: Write minimal implementation**

- Add a small helper to build create/update payloads
- Use helper inside `handleSubmitProductForm`
- Include `tb_sales` and computed `tb_commission`

**Step 4: Run test to verify it passes**

Run: `npm test src/components/archive/ArchivePageContent.test.tsx -w`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ArchivePageContent.tsx src/components/archive/ArchivePageContent.test.tsx
git commit -m "feat: persist jd/tb metrics for sourcing items"
```

### Task 3: Backend Taobao details returns 30-day sales

**Files:**
- Modify: `backend/tests/test_sourcing_taobao_link.py`
- Modify: `backend/main.py`

**Step 1: Write the failing test**

```python
async def test_taobao_item_details_includes_sales():
    # mock taobao_api_request to return volume
```

**Step 2: Run test to verify it fails**

Run: `python backend/tests/test_sourcing_taobao_link.py`
Expected: FAIL (sales missing)

**Step 3: Write minimal implementation**

- Map `volume` (or equivalent) into a `sales30`/`sales` field
- Return it in `/api/taobao/product` response

**Step 4: Run test to verify it passes**

Run: `python backend/tests/test_sourcing_taobao_link.py`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/main.py backend/tests/test_sourcing_taobao_link.py
git commit -m "feat: include taobao sales in product details"
```

### Task 4: Verify UI list uses dual metrics

**Files:**
- Modify: `src/components/archive/ArchiveListCard.test.tsx` (if needed)
- Modify: `src/components/archive/ArchiveListCard.tsx` (if needed)

**Step 1: Write the failing test**

```tsx
it("renders JD and TB metric rows", () => {
  // expect both JD/TB badges visible
})
```

**Step 2: Run test to verify it fails**

Run: `npm test src/components/archive/ArchiveListCard.test.tsx -w`
Expected: FAIL (no TB row yet)

**Step 3: Write minimal implementation**

- Ensure TB row renders with fallback metrics

**Step 4: Run test to verify it passes**

Run: `npm test src/components/archive/ArchiveListCard.test.tsx -w`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ArchiveListCard.tsx src/components/archive/ArchiveListCard.test.tsx
git commit -m "feat: render tb metrics row on archive cards"
```

---

Plan complete and saved to `docs/plans/2026-02-04-jd-tb-metrics-plan.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?

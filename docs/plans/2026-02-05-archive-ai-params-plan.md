# Archive AI Params (Sourcing) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add AI-driven parameter fetching for single items and batch (current filter scope) in the Archive page, with progress dialog, preview+confirm for single, direct write for batch, and AI-generated 评价 written to remark when empty.

**Architecture:** Add a backend batch job API for AI param fill (start + status), extend AI prompt/normalization to include a “评价” field, and update frontend Archive page to call these APIs, show progress, show preview dialog, and write changes. Use existing ProgressDialog for both flows.

**Tech Stack:** FastAPI (backend/main.py), Supabase, DashScope Qwen/DeepSeek/GLM, React (Vite), TypeScript, shadcn/ui components.

---

### Task 1: Backend – Extend AI output to include “评价” and write to remark

**Files:**
- Modify: `backend/main.py`
- Test: `backend/tests/test_ai_fill_params.py`
- Test: `backend/tests/test_ai_fill_params_model_override.py`
- Test: `backend/tests/test_ai_fill_params_glm.py`
- (Optional new) Test: `backend/tests/test_ai_fill_params_review.py`

**Step 1: Write failing test for “评价” retention**

```python
# backend/tests/test_ai_fill_params_review.py

def test_ai_fill_includes_review_field_when_returned(mock_qwen):
    # mock_qwen should return JSON with "评价"
    result = asyncio.run(
        ai_fill_product_params(
            "蓝牙耳机",
            [{"key": "佩戴方式"}],
            ["商品A"],
            model_override="qwen3-max-2026-01-23",
        )
    )
    assert result[0].get("评价") == "百元内大手平替"
```

**Step 2: Run test to verify it fails**

Run: `pytest backend/tests/test_ai_fill_params_review.py -v`
Expected: FAIL because “评价” gets filtered out.

**Step 3: Implement minimal change**

- In `ai_fill_product_params`:
  - Prompt: add requirement to output field “评价”（基于参数生成，尽量≤20字，不是评价数）
  - Allow key “评价” in the output validation (field_keys + ["name", "评价"]).

**Step 4: Run test to verify it passes**

Run: `pytest backend/tests/test_ai_fill_params_review.py -v`
Expected: PASS.

**Step 5: Update ai-confirm to write remark when empty**

- In `ai_confirm_sourcing_items`, read `item_data.get("评价")` or `item_data.get("remark")`.
- If existing remark is empty and incoming 评价 is not empty, set remark.

**Step 6: Add/adjust tests**

```python
# backend/tests/test_ai_fill_params_review.py

def test_ai_confirm_writes_remark_only_if_empty(client):
    # create item with empty remark
    # call ai-confirm with 评价
    # verify remark updated
    # update again with another 评价
    # verify remark did not overwrite
```

**Step 7: Run tests**

Run: `pytest backend/tests/test_ai_fill_params_review.py -v`
Expected: PASS.

---

### Task 2: Backend – Batch AI job endpoints

**Files:**
- Modify: `backend/main.py`
- Test: `backend/tests/test_ai_batch_params.py`

**Step 1: Write failing test for batch start/status**

```python
# backend/tests/test_ai_batch_params.py

def test_ai_batch_start_and_status(client, monkeypatch):
    # monkeypatch ai_fill_product_params to return deterministic results
    # call /api/sourcing/items/ai-batch/start
    # call /api/sourcing/items/ai-batch/status/{job_id}
    # expect status in {"running","done"} and total > 0
```

**Step 2: Implement minimal job store**

- Add in-memory store + lock (mirror zhihu job store pattern):
  - `SOURCING_AI_JOB_STORE`, `create_sourcing_ai_job_state`, `update`, `get`.
- Job state fields: `id, status, total, processed, success, failed, failures, error, started_at, finished_at`.

**Step 3: Implement /ai-batch/start**

- Payload: `{ category_id?, scheme_id?, keyword?, price_min?, price_max?, sort?, model? }`
- Resolve items:
  - If `scheme_id`: fetch scheme → resolve item ids → fetch items in chunks.
  - Else: fetch sourcing_items by category + keyword (ilike) and then filter by price range.
- Start background task (asyncio.create_task) to:
  - chunk product titles; call `ai_fill_product_params`.
  - map results back by `name`.
  - build spec updates (fill empty only) + remark (if empty, from 评价).
  - update progress after each chunk.

**Step 4: Implement /ai-batch/status/{job_id}**

- Return job state for polling.

**Step 5: Run tests**

Run: `pytest backend/tests/test_ai_batch_params.py -v`
Expected: PASS.

---

### Task 3: Frontend – API helpers

**Files:**
- Modify: `src/components/archive/archiveApi.ts`

**Step 1: Add AI preview helpers**

```ts
export async function aiFillPreview(payload: {
  category_id: string
  product_names: string[]
  model?: string
})

export async function aiConfirm(payload: {
  category_id: string
  items: Record<string, string>[]
})
```

**Step 2: Add batch helpers**

```ts
export async function aiBatchStart(payload: {
  category_id?: string
  scheme_id?: string
  keyword?: string
  price_min?: number
  price_max?: number
  sort?: string
  model?: string
})

export async function aiBatchStatus(jobId: string)
```

**Step 3: No tests (API thin wrapper)**

---

### Task 4: Frontend – Single-item “获取参数” flow

**Files:**
- Modify: `src/components/archive/ArchiveListCard.tsx`
- Modify: `src/components/archive/ArchivePageContent.tsx`
- Create: `src/components/archive/AiParamsPreviewDialog.tsx`
- Test: `src/components/archive/ArchiveListCard.test.tsx`

**Step 1: Update card labels**

- `TEXT.matchParams` → “获取参数”
- `TEXT.remarkLabel` → “评价：”

**Step 2: Create preview dialog**

- Dialog shows:
  - 预设字段列表（全部字段）
  - 旧值 / 新值（包含“评价”）
  - confirm / cancel

**Step 3: Wire single-item flow**

- On card click:
  - open ProgressDialog (title: “获取参数进度”)
  - call `aiFillPreview`
  - close progress, open preview dialog
- On confirm:
  - call `aiConfirm` with spec fields + “评价”
  - update local item state

**Step 4: Update tests**

- Expect button label “获取参数”.
- Expect remark label “评价：”.

---

### Task 5: Frontend – Batch “获取参数” + model selector

**Files:**
- Modify: `src/components/archive/ArchivePageView.tsx`
- Modify: `src/components/archive/ArchivePageContent.tsx`

**Step 1: Add UI**

- Place new button **left of “预设参数”**.
- Add model Select (default qwen3-max-2026-01-23).

**Step 2: Implement batch behavior**

- Collect current filters:
  - categoryValue
  - schemeFilterId
  - searchValue
  - safePriceRange
  - sortValue
- Call `aiBatchStart`.
- Poll `aiBatchStatus` every 1–2s; update ProgressDialog.
- On done: toast success/fail count, refresh list.

---

### Task 6: Verification

**Step 1: Backend tests**

Run:
- `pytest backend/tests/test_ai_fill_params_review.py -v`
- `pytest backend/tests/test_ai_batch_params.py -v`

**Step 2: Frontend tests**

Run:
- `pnpm test src/components/archive/ArchiveListCard.test.tsx`

---

### Task 7: Commit

```bash
git add backend/main.py backend/tests src/components/archive src/components/ProgressDialog.tsx
git commit -m "feat: archive ai params preview and batch"
```

---

**Plan complete and saved to `docs/plans/2026-02-05-archive-ai-params-plan.md`. Two execution options:**

1. Subagent-Driven (this session) – I dispatch a fresh subagent per task, review between tasks.
2. Parallel Session (separate) – Open a new session with executing-plans, batch execution with checkpoints.

Which approach?

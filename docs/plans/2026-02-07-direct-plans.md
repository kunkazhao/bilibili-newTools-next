# Direct Plans Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a “定向计划” tool page with CRUD + drag排序，数据持久化到后端 `direct_plans` 表。

**Architecture:** 后端新增 `direct_plans` 表与 `/api/direct-plans` 接口；前端新增页面与弹窗表单，列表支持拖拽并立即持久化排序。使用现有 UI 组件（ModalForm/Select/Input/Button）。

**Tech Stack:** FastAPI + Supabase, React + Vite, Vitest.

---

### Task 1: Create Supabase table for direct_plans

**Files:**
- Create: `supabase/migrations/2026_02_07_add_direct_plans.sql`

**Step 1: Write migration**

```sql
create table if not exists public.direct_plans (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  category text not null,
  brand text not null,
  commission_rate text,
  sort_order integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists direct_plans_sort_idx
  on public.direct_plans (sort_order);
```

**Step 2: Apply migration (MCP)**

Run: `mcp__supabase__apply_migration` with name `add_direct_plans` and the SQL above.

**Step 3: Commit**

```bash
git add supabase/migrations/2026_02_07_add_direct_plans.sql
git commit -m "feat(db): add direct_plans table"
```

---

### Task 2: Add backend tests for direct plans (TDD)

**Files:**
- Create: `backend/tests/test_direct_plans.py`

**Step 1: Write failing tests**

```python
import sys
from pathlib import Path
import unittest
from fastapi import HTTPException

sys.path.append(str(Path(__file__).resolve().parents[1]))

import backend.api.direct_plans as direct_plans


class _FakeSupabaseClient:
    def __init__(self):
        self.select_payloads = []
        self.insert_payload = None
        self.upsert_payload = None
        self.upsert_conflict = None
        self.rows = []

    async def select(self, table, params=None):
        self.select_payloads.append((table, params or {}))
        return list(self.rows)

    async def insert(self, table, payload):
        self.insert_payload = payload
        return [payload]

    async def update(self, table, payload, filters):
        return [payload]

    async def upsert(self, table, payload, on_conflict=None):
        self.upsert_payload = payload
        self.upsert_conflict = on_conflict
        return payload


class DirectPlansTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        super().setUp()
        self.client = _FakeSupabaseClient()
        self._orig_ensure = direct_plans.ensure_supabase
        self._orig_now = direct_plans.utc_now_iso
        direct_plans.ensure_supabase = lambda: self.client
        direct_plans.utc_now_iso = lambda: "2026-02-07T08:30:00Z"

    def tearDown(self):
        direct_plans.ensure_supabase = self._orig_ensure
        direct_plans.utc_now_iso = self._orig_now
        super().tearDown()

    async def test_create_requires_platform_category_brand(self):
        with self.assertRaises(HTTPException) as ctx:
            await direct_plans.create_direct_plan({"platform": "", "category": "A", "brand": "B"})
        self.assertEqual(ctx.exception.status_code, 400)

    async def test_create_sets_sort_order_to_top(self):
        self.client.rows = [{"sort_order": 20, "created_at": "2026-02-01"}]
        payload = {"platform": "京东", "category": "耳机", "brand": "X", "commission_rate": "20%"}
        result = await direct_plans.create_direct_plan(payload)
        self.assertIsNotNone(self.client.insert_payload)
        self.assertEqual(self.client.insert_payload.get("sort_order"), 10)
        self.assertEqual(result.get("plan").get("platform"), "京东")

    async def test_reorder_updates_sort_order(self):
        await direct_plans.reorder_direct_plans({"ids": ["a", "b", "c"]})
        self.assertEqual(self.client.upsert_conflict, "id")
        sort_orders = [row["sort_order"] for row in self.client.upsert_payload]
        self.assertEqual(sort_orders, [0, 1, 2])


if __name__ == "__main__":
    unittest.main()
```

**Step 2: Run tests to verify failure**

Run: `python -m pytest backend/tests/test_direct_plans.py -q`
Expected: FAIL (module missing or functions missing).

**Step 3: Commit test**

```bash
git add backend/tests/test_direct_plans.py
git commit -m "test(backend): add direct plans API coverage"
```

---

### Task 3: Implement backend API for direct plans

**Files:**
- Create: `backend/api/direct_plans.py`
- Modify: `backend/main.py`
- Modify: `backend/tests/test_api_module_routers.py`

**Step 1: Implement API module**

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()

try:
    import main as core
except Exception:
    from backend import main as core

globals().update({k: v for k, v in core.__dict__.items() if not k.startswith("_")})


def ensure_supabase(*args, **kwargs):
    return core.ensure_supabase(*args, **kwargs)


def utc_now_iso(*args, **kwargs):
    return core.utc_now_iso(*args, **kwargs)


class DirectPlanCreate(BaseModel):
    platform: str
    category: str
    brand: str
    commission_rate: Optional[str] = None


class DirectPlanUpdate(BaseModel):
    platform: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    commission_rate: Optional[str] = None


class DirectPlanReorder(BaseModel):
    ids: List[str]


def normalize_direct_plan(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row.get("id"),
        "platform": row.get("platform"),
        "category": row.get("category"),
        "brand": row.get("brand"),
        "commission_rate": row.get("commission_rate"),
        "sort_order": row.get("sort_order"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


@router.get("/api/direct-plans")
async def list_direct_plans():
    client = ensure_supabase()
    try:
        rows = await client.select(
            "direct_plans",
            params={"order": "sort_order.asc.nullslast,created_at.desc"},
        )
    except SupabaseError as exc:
        if "sort_order" in str(exc.message):
            rows = await client.select("direct_plans", params={"order": "created_at.desc"})
        else:
            raise HTTPException(status_code=500, detail=str(exc.message))
    return {"plans": [normalize_direct_plan(row) for row in rows]}


@router.post("/api/direct-plans")
async def create_direct_plan(payload: DirectPlanCreate):
    client = ensure_supabase()
    platform = (payload.platform or "").strip()
    category = (payload.category or "").strip()
    brand = (payload.brand or "").strip()
    if not platform or not category or not brand:
        raise HTTPException(status_code=400, detail="平台/分类/品牌不能为空")

    sort_order = None
    try:
        rows = await client.select(
            "direct_plans",
            params={"select": "sort_order,created_at", "order": "sort_order.asc.nullslast,created_at.desc", "limit": 1},
        )
        if rows:
            base = rows[0].get("sort_order")
            sort_order = (int(base) - 10) if base is not None else 0
        else:
            sort_order = 0
    except SupabaseError as exc:
        if "sort_order" in str(exc.message):
            sort_order = 0
        else:
            raise HTTPException(status_code=500, detail=str(exc.message))

    now = utc_now_iso()
    body = {
        "platform": platform,
        "category": category,
        "brand": brand,
        "commission_rate": (payload.commission_rate or "").strip() or None,
        "sort_order": sort_order,
        "created_at": now,
        "updated_at": now,
    }
    record = await client.insert("direct_plans", body)
    return {"plan": normalize_direct_plan(record[0])}


@router.patch("/api/direct-plans/{plan_id}")
async def update_direct_plan(plan_id: str, payload: DirectPlanUpdate):
    client = ensure_supabase()
    updates: Dict[str, Any] = {}
    if payload.platform is not None:
        value = payload.platform.strip()
        if not value:
            raise HTTPException(status_code=400, detail="平台不能为空")
        updates["platform"] = value
    if payload.category is not None:
        value = payload.category.strip()
        if not value:
            raise HTTPException(status_code=400, detail="分类不能为空")
        updates["category"] = value
    if payload.brand is not None:
        value = payload.brand.strip()
        if not value:
            raise HTTPException(status_code=400, detail="品牌不能为空")
        updates["brand"] = value
    if payload.commission_rate is not None:
        updates["commission_rate"] = payload.commission_rate.strip() or None
    if not updates:
        raise HTTPException(status_code=400, detail="没有需要更新的内容")
    updates["updated_at"] = utc_now_iso()
    record = await client.update("direct_plans", updates, {"id": f"eq.{plan_id}"})
    if not record:
        raise HTTPException(status_code=404, detail="定向计划不存在")
    return {"plan": normalize_direct_plan(record[0])}


@router.delete("/api/direct-plans/{plan_id}")
async def delete_direct_plan(plan_id: str):
    client = ensure_supabase()
    existing = await client.select("direct_plans", {"id": f"eq.{plan_id}"})
    if not existing:
        raise HTTPException(status_code=404, detail="定向计划不存在")
    await client.delete("direct_plans", {"id": f"eq.{plan_id}"})
    return {"status": "ok"}


@router.post("/api/direct-plans/reorder")
async def reorder_direct_plans(payload: DirectPlanReorder):
    ids = payload.ids
    if not ids:
        raise HTTPException(status_code=400, detail="排序列表不能为空")
    client = ensure_supabase()
    now = utc_now_iso()
    rows = [{"id": plan_id, "sort_order": index, "updated_at": now} for index, plan_id in enumerate(ids)]
    await client.upsert("direct_plans", rows, on_conflict="id")
    return {"status": "ok"}
```

**Step 2: Register router**

In `backend/main.py` include:

```python
from backend.api import direct_plans
app.include_router(direct_plans.router)
```

**Step 3: Update router test list**

Add `"backend.api.direct_plans"` to `backend/tests/test_api_module_routers.py`.

**Step 4: Run tests**

Run: `python -m pytest backend/tests/test_direct_plans.py -q`
Expected: PASS.

**Step 5: Commit**

```bash
git add backend/api/direct_plans.py backend/main.py backend/tests/test_api_module_routers.py
git commit -m "feat(backend): add direct plans api"
```

---

### Task 4: Add front-end view tests (TDD)

**Files:**
- Create: `src/components/direct-plans/DirectPlansPageView.test.tsx`

**Step 1: Write failing test**

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import DirectPlansPageView from "./DirectPlansPageView"
import type { DirectPlan } from "./types"

const baseProps = {
  loading: false,
  plans: [] as DirectPlan[],
  onAdd: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  onDrop: vi.fn(),
}

describe("DirectPlansPageView", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders empty state", () => {
    render(<DirectPlansPageView {...baseProps} />)
    expect(screen.getByText("暂无定向计划")).toBeTruthy()
  })

  it("renders list rows", () => {
    const plans = [
      { id: "p1", platform: "京东", category: "耳机", brand: "X", commission_rate: "20%" },
    ] as DirectPlan[]
    render(<DirectPlansPageView {...baseProps} plans={plans} />)
    expect(screen.getByText("京东")).toBeTruthy()
    expect(screen.getByText("耳机")).toBeTruthy()
    expect(screen.getByText("X")).toBeTruthy()
  })
})
```

**Step 2: Run tests to verify failure**

Run: `npm test -- DirectPlansPageView.test.tsx`
Expected: FAIL (component missing).

**Step 3: Commit**

```bash
git add src/components/direct-plans/DirectPlansPageView.test.tsx
git commit -m "test(frontend): add direct plans view tests"
```

---

### Task 5: Implement front-end direct plans page

**Files:**
- Create: `src/components/direct-plans/types.ts`
- Create: `src/components/direct-plans/DirectPlansPageView.tsx`
- Create: `src/components/direct-plans/DirectPlansPageContent.tsx`
- Create: `src/pages/DirectPlansPage.tsx`
- Modify: `src/config/pages.ts`

**Step 1: Implement types**

```ts
export type DirectPlanPlatform = "京东" | "淘宝" | "京东+淘宝"

export interface DirectPlan {
  id: string
  platform: DirectPlanPlatform
  category: string
  brand: string
  commission_rate?: string | null
  sort_order?: number | null
  created_at?: string | null
  updated_at?: string | null
}
```

**Step 2: Implement view component**

- Header: 标题“定向计划” + 说明文案 + 新增按钮
- List: 使用 `Table` + 自定义首列拖拽手柄 + 操作列（编辑/删除）
- Empty: `Empty` 组件，文案“暂无定向计划”

**Step 3: Implement content component**

- 拉取 `GET /api/direct-plans`（返回 `{ plans: [] }`）
- 新增弹窗（ModalForm + Field/Select/Input）
- 编辑弹窗复用同一表单
- 删除确认使用 `AlertDialog`
- 拖拽排序：前端立即重排 + `POST /api/direct-plans/reorder` 持久化
- 新增后列表置顶（`setPlans([newPlan, ...prev])`）

**Step 4: Add page entry**

- `src/pages/DirectPlansPage.tsx` 直接导出 `DirectPlansPageContent`
- `src/config/pages.ts` 添加 `{ id: "direct-plans", label: "定向计划", group: "utility", render: ... }`

**Step 5: Run tests**

Run: `npm test -- DirectPlansPageView.test.tsx`
Expected: PASS.

**Step 6: Commit**

```bash
git add src/components/direct-plans src/pages/DirectPlansPage.tsx src/config/pages.ts
git commit -m "feat(frontend): add direct plans page"
```

---

### Task 6: Full verification

Run: `python -m pytest backend/tests -q`
Expected: PASS.

Optionally run: `npm test` (if you want full frontend tests).

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-02-07-direct-plans.md`. Two execution options:

1. Subagent-Driven (this session) – I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) – Open new session with executing-plans, batch execution with checkpoints

Which approach?

# Backend Route Modularization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split `backend/main.py` routes into module routers under `backend/api/*` while keeping all endpoints and behavior unchanged.

**Architecture:** Create one router module per API group, move existing route functions verbatim, and register routers in `backend/main.py`. Keep shared helpers in `backend/main.py` initially to avoid behavioral changes, then progressively pull pure helpers into `backend/services/*` if needed.

**Tech Stack:** FastAPI + Python, pytest.

---

### Task 1: Add a failing test that requires module routers to exist

**Files:**
- Create: `backend/tests/test_api_module_routers.py`

**Step 1: Write the failing test**

```python
from fastapi import APIRouter
import importlib

MODULES = [
    "backend.api.sourcing",
    "backend.api.schemes",
    "backend.api.comment",
    "backend.api.commission",
    "backend.api.zhihu",
    "backend.api.bilibili",
    "backend.api.video",
    "backend.api.benchmark",
    "backend.api.blue_link_map",
]


def test_api_modules_export_router():
    for name in MODULES:
        module = importlib.import_module(name)
        assert hasattr(module, "router"), f"{name} missing router"
        router = getattr(module, "router")
        assert isinstance(router, APIRouter)
```

**Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_api_module_routers.py -q`
Expected: FAIL (module import error).

**Step 3: Commit test**

```bash
git add backend/tests/test_api_module_routers.py
git commit -m "test(backend): require api module routers"
```

---

### Task 2: Create `backend/api` package and move route groups

**Files:**
- Create: `backend/api/__init__.py`
- Create: `backend/api/sourcing.py`
- Create: `backend/api/schemes.py`
- Create: `backend/api/comment.py`
- Create: `backend/api/commission.py`
- Create: `backend/api/zhihu.py`
- Create: `backend/api/bilibili.py`
- Create: `backend/api/video.py`
- Create: `backend/api/benchmark.py`
- Create: `backend/api/blue_link_map.py`
- Modify: `backend/main.py`

**Step 1: Create api package skeleton**

Each module starts with:

```python
from fastapi import APIRouter

router = APIRouter()
```

**Step 2: Move routes from `backend/main.py` into modules**

Move route functions verbatim to match grouping:
- `sourcing.py`: all `/api/sourcing/*`
- `schemes.py`: all `/api/schemes/*`, `/api/image/templates`, `/api/prompts/*`
- `comment.py`: `/api/comment/*`, `/api/my-accounts/*`
- `commission.py`: `/api/jd/*`, `/api/taobao/*`
- `zhihu.py`: `/api/zhihu/*`
- `bilibili.py`: `/api/bilibili/*`
- `video.py`: `/api/video/*`, `/api/subtitle/*`, `/api/rembg/*`
- `benchmark.py`: `/api/benchmark/*`
- `blue_link_map.py`: `/api/blue-link-map/*`

When moving, replace `@app.<method>` with `@router.<method>`.

**Step 3: Register routers in `backend/main.py`**

Add imports near the end of main:

```python
from backend.api import (
    sourcing,
    schemes,
    comment,
    commission,
    zhihu,
    bilibili,
    video,
    benchmark,
    blue_link_map,
)

app.include_router(sourcing.router)
app.include_router(schemes.router)
app.include_router(comment.router)
app.include_router(commission.router)
app.include_router(zhihu.router)
app.include_router(bilibili.router)
app.include_router(video.router)
app.include_router(benchmark.router)
app.include_router(blue_link_map.router)
```

**Step 4: Keep shared helpers in `backend/main.py`**

Do **not** move shared helper functions yet; keep imports and helper functions in `backend/main.py` to minimize regression risk.

**Step 5: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_api_module_routers.py -q`
Expected: PASS.

**Step 6: Run smoke tests**

Run: `python -m pytest backend/tests/test_blue_link_routes.py backend/tests/test_zhihu_routes.py backend/tests/test_sourcing_items_by_ids.py -q`
Expected: PASS.

**Step 7: Commit**

```bash
git add backend/api backend/main.py
git commit -m "refactor(backend): split api routes into modules"
```

---

### Task 3: Full backend test pass

**Files:**
- Test: `backend/tests/*`

**Step 1: Run tests**

Run: `python -m pytest backend/tests -q`
Expected: PASS.

**Step 2: Commit (if any fixes)**

```bash
git add backend/main.py backend/api backend/tests
git commit -m "test(backend): ensure route split passes"
```

---

## Execution Handoff

Plan complete and saved. Two execution options:

1. Subagent-Driven (this session) – dispatch fresh subagent per task, review between tasks
2. Parallel Session (separate) – open new session with executing-plans, batch execution with checkpoints

Which approach?

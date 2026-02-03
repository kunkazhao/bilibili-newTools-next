# Comment Blue Link Category Removal Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove comment category endpoints and database structures, and strip all category fields from comment combo APIs and UI.

**Architecture:** Delete comment category routes and payload models, drop `comment_categories` table and `comment_combos.category_id`, and update state payloads/types/tests so comment blue link only uses accounts + combos.

**Tech Stack:** FastAPI + Pydantic (backend), Supabase Postgres via MCP migration, React + Vitest (frontend).

### Task 1: Add failing backend tests for category removal

**Files:**
- Create: `backend/tests/test_comment_blue_link_cleanup.py`

**Step 1: Write the failing test**

```python
import sys
from pathlib import Path
import unittest
from fastapi.routing import APIRoute

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import app, CommentComboCreate


def has_route(path: str, methods=None) -> bool:
    methods = {m.upper() for m in (methods or {"GET"})}
    for route in app.routes:
        if isinstance(route, APIRoute) and route.path == path:
            route_methods = {m.upper() for m in (route.methods or set())}
            if methods.issubset(route_methods):
                return True
    return False


class CommentBlueLinkCleanupTests(unittest.TestCase):
    def test_comment_category_routes_removed(self):
        self.assertFalse(has_route("/api/comment/categories", {"POST"}))
        self.assertFalse(has_route("/api/comment/categories/{category_id}", {"DELETE"}))

    def test_comment_combo_create_has_no_category_field(self):
        self.assertNotIn("category_id", CommentComboCreate.model_fields)


if __name__ == "__main__":
    unittest.main()
```

**Step 2: Run test to verify it fails**

Run: `python -m unittest backend.tests.test_comment_blue_link_cleanup`
Expected: FAIL because routes still exist and model still has `category_id`.

### Task 2: Remove backend category routes and fields

**Files:**
- Modify: `backend/main.py`

**Step 1: Remove category models and routes**
- Delete `CommentCategoryPayload` model.
- Delete `/api/comment/categories` POST/DELETE endpoints.
- Remove `comment_categories` deletion from `delete_comment_account`.
- Remove `normalize_comment_category` helper and category usage in `fetch_comment_snapshot`.

**Step 2: Remove category_id from combo models and responses**
- Remove `category_id` from `CommentComboCreate` and `CommentComboUpdate`.
- Remove `category_id` from `normalize_comment_combo`.
- Remove any updates to `category_id` in create/patch logic.

**Step 3: Run tests**

Run: `python -m unittest backend.tests.test_comment_blue_link_cleanup`
Expected: PASS.

### Task 3: Drop database category structures (Supabase MCP)

**Files:**
- Apply migration via MCP: `mcp__supabase__apply_migration`

**Step 1: Apply migration**

SQL:
```sql
ALTER TABLE IF EXISTS comment_combos DROP COLUMN IF EXISTS category_id CASCADE;
DROP TABLE IF EXISTS comment_categories;
```

**Step 2: Verify in Supabase**
- `comment_categories` table no longer exists.
- `comment_combos` has no `category_id` column.

### Task 4: Remove frontend category types and API fields

**Files:**
- Modify: `src/components/comment-blue-link/types.ts`
- Modify: `src/components/comment-blue-link/commentBlueLinkApi.ts`
- Modify: `src/components/comment-blue-link/CommentBlueLinkPageContent.test.tsx`
- Modify: `src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx`

**Step 1: Update types**
- Remove `CommentCategory` interface.
- Remove `category_id` from `CommentCombo`.

**Step 2: Update API type**
- Remove `categories` from the state response type in `commentBlueLinkApi.ts`.

**Step 3: Update tests**
- Remove `category_id` fields in mock combo objects.
- Ensure tests pass with new types.

**Step 4: Run frontend tests**

Run: `npm test -- src/components/comment-blue-link/CommentBlueLinkPageContent.test.tsx`
Run: `npm test -- src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx`
Expected: PASS.

### Task 5: Commit

```bash
git add backend/main.py backend/tests/test_comment_blue_link_cleanup.py src/components/comment-blue-link/types.ts src/components/comment-blue-link/commentBlueLinkApi.ts src/components/comment-blue-link/CommentBlueLinkPageContent.test.tsx src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx

git commit -m "feat: remove comment blue link categories"
```

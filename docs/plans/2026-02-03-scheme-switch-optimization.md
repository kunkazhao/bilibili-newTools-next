# Scheme Switch Performance Optimization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Speed up scheme dropdown switching by eliminating per-item fetch waterfalls and introducing a batch items endpoint + client caching.

**Architecture:** Add a backend batch endpoint to return item details for a list of IDs in one request. Update the frontend scheme filter loader to use the batch endpoint, keep a per-scheme cache with TTL, and retain current behavior as fallback if batch fails. Keep existing endpoints intact for compatibility.

**Tech Stack:** FastAPI (backend/main.py), React + TS (ArchivePageContent.tsx), Vitest tests, Python unittest/pytest.

---

### Task 1: Add backend batch items endpoint

**Files:**
- Modify: `backend/main.py`
- Test: `backend/tests/test_sourcing_items_batch.py` (new)

**Step 1: Write the failing test**

```python
import unittest
from fastapi.testclient import TestClient
from main import app

class SourcingItemsBatchTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_batch_items_returns_items_in_requested_order(self):
        # This test assumes a test DB fixture or mocked repo; adapt IDs to known fixtures.
        payload = {"ids": ["item-1", "item-2"]}
        resp = self.client.post("/api/sourcing/items/batch", json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("items", data)
        self.assertEqual([item["id"] for item in data["items"]], payload["ids"])

if __name__ == "__main__":
    unittest.main()
```

**Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_sourcing_items_batch.py -q`
Expected: FAIL (endpoint missing)

**Step 3: Write minimal implementation**

In `backend/main.py`:
- Add new route: `POST /api/sourcing/items/batch`
- Body: `{ "ids": ["..."] }`
- Behavior:
  - Deduplicate, preserve input order
  - Fetch items by IDs in one DB query if possible
  - Return `{ items: [ ...normalized items... ] }` in requested order, skipping missing IDs

**Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_sourcing_items_batch.py -q`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/main.py backend/tests/test_sourcing_items_batch.py
git commit -m "feat: add batch sourcing items endpoint"
```

---

### Task 2: Frontend uses batch endpoint for scheme filter

**Files:**
- Modify: `src/components/archive/ArchivePageContent.tsx`
- Test: `src/components/archive/ArchivePageContent.test.ts` (extend)

**Step 1: Write the failing test**

Add a test that:
- Mocks `apiRequest` for `/api/schemes/{id}` and `/api/sourcing/items/batch`
- Switches scheme filter
- Asserts batch endpoint is called once and per-item endpoint is not called

**Step 2: Run test to verify it fails**

Run: `npm.cmd test -- ArchivePageContent.test.ts`
Expected: FAIL (still calling per-item endpoint)

**Step 3: Write minimal implementation**

In `ArchivePageContent.tsx`:
- Update `loadSchemeFilterItems` to:
  - Call `/api/schemes/{id}` to get `items`
  - Extract `source_id` list
  - Call `/api/sourcing/items/batch` with `ids`
  - Normalize and order results to match scheme order
  - Fallback to existing per-item flow if batch call fails

**Step 4: Run test to verify it passes**

Run: `npm.cmd test -- ArchivePageContent.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ArchivePageContent.tsx src/components/archive/ArchivePageContent.test.ts
git commit -m "perf: batch load scheme items"
```

---

### Task 3: Add scheme filter cache TTL to reduce repeat loads

**Files:**
- Modify: `src/components/archive/ArchivePageContent.tsx`
- Test: `src/components/archive/ArchivePageContent.test.ts`

**Step 1: Write the failing test**

Add a test that:
- Switches to scheme A (loads via batch)
- Switches away and back within TTL
- Asserts batch endpoint not called second time

**Step 2: Run test to verify it fails**

Run: `npm.cmd test -- ArchivePageContent.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**

In `ArchivePageContent.tsx`:
- Store cache with timestamp: `{ items, timestamp }`
- Use TTL (e.g., 5 minutes) when reusing cached scheme items

**Step 4: Run test to verify it passes**

Run: `npm.cmd test -- ArchivePageContent.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ArchivePageContent.tsx src/components/archive/ArchivePageContent.test.ts
git commit -m "perf: add scheme filter cache ttl"
```

---

### Task 4: Verification

**Step 1: Run backend tests**

Run:
- `python -m pytest backend/tests/test_sourcing_items_batch.py -q`

**Step 2: Run frontend tests**

Run:
- `npm.cmd test -- ArchivePageContent.test.ts`

---

## Notes
- Keep old `/api/sourcing/items/{id}` endpoint for compatibility.
- If batch endpoint is not available (backend error), fall back to per-item fetch.
- Preserve scheme item order to match scheme definition.


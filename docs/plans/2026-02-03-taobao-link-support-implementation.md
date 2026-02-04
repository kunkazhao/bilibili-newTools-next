# Taobao Link Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Taobao/Tmall affiliate link parsing and product detail retrieval using only `taobao.tbk.item.click.extract` + `taobao.tbk.item.details.upgrade.get` and wire it into sourcing (选品库) + commission (获取佣金).

**Architecture:** Backend exposes `/api/taobao/resolve` (link -> item_id/open_iid) and `/api/taobao/product` (item_id/open_iid -> detail + pure commission rate). Frontend reuses existing JD parsing flows, branching by link type and calling the Taobao endpoints, with shared normalized response shape.

**Tech Stack:** FastAPI (backend/main.py), aiohttp/httpx, React + TS, existing `apiRequest` helper, Jest/Vitest-style tests in `src/components/**`.

---

### Task 1: Add Taobao Open API client helpers (backend)

**Files:**
- Modify: `backend/main.py`
- Test: `backend/tests/test_taobao_api.py` (new)

**Step 1: Write the failing test**

```python
import unittest
from unittest.mock import patch
from main import build_taobao_signed_params, normalize_taobao_commission_rate

class TaobaoApiHelpersTests(unittest.TestCase):
  def test_normalize_commission_rate(self):
    self.assertEqual(normalize_taobao_commission_rate("1550"), "15.5%")
    self.assertEqual(normalize_taobao_commission_rate(1200), "12%")
    self.assertEqual(normalize_taobao_commission_rate(None), "")

  @patch("main.time.time", return_value=1700000000)
  def test_signing_includes_required_params(self, _):
    params = build_taobao_signed_params("test.method", {"item_id": "1"})
    self.assertIn("method", params)
    self.assertIn("sign", params)
    self.assertIn("timestamp", params)

if __name__ == "__main__":
  unittest.main()
```

**Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_taobao_api.py -q`
Expected: FAIL (helpers not found)

**Step 3: Write minimal implementation**

Add in `backend/main.py`:
- env vars: `TAOBAO_APP_KEY`, `TAOBAO_APP_SECRET`, `TAOBAO_SESSION`, `TAOBAO_ADZONE_ID`
- helpers:
  - `build_taobao_signed_params(method, params)` -> add `app_key`, `timestamp`, `format=json`, `v=2.0`, `sign_method=md5`, `method`, `session` (if set), and `sign`
  - `normalize_taobao_commission_rate(value)` -> convert integer basis points to percent string
- shared `taobao_api_request(method, params)` -> POST to `https://eco.taobao.com/router/rest`

**Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_taobao_api.py -q`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/main.py backend/tests/test_taobao_api.py
git commit -m "feat: add taobao open api helpers"
```

---

### Task 2: Add Taobao resolve/detail endpoints (backend)

**Files:**
- Modify: `backend/main.py`
- Test: `backend/tests/test_taobao_endpoints.py` (new)

**Step 1: Write the failing test**

```python
import unittest
from unittest.mock import AsyncMock, patch
from main import taobao_click_extract, taobao_item_details

class TaobaoEndpointsTests(unittest.TestCase):
  @patch("main.taobao_api_request", new_callable=AsyncMock)
  def test_click_extract_maps_item_id(self, mock_call):
    mock_call.return_value = {"tbk_item_click_extract_response": {"data": {"item_id": "123"}}}
    result = asyncio.run(taobao_click_extract("https://item.taobao.com/item.htm?id=123"))
    self.assertEqual(result.get("itemId"), "123")

  @patch("main.taobao_api_request", new_callable=AsyncMock)
  def test_item_details_maps_commission_rate(self, mock_call):
    mock_call.return_value = {
      "tbk_item_details_upgrade_get_response": {
        "results": {"n_tbk_item": [{"title": "X", "pict_url": "img", "publish_info": {"income_info": {"commission_rate": "1550"}}}]}
      }
    }
    result = asyncio.run(taobao_item_details("123"))
    self.assertEqual(result.get("commissionRate"), "15.5%")

if __name__ == "__main__":
  unittest.main()
```

**Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_taobao_endpoints.py -q`
Expected: FAIL (functions not found)

**Step 3: Write minimal implementation**

In `backend/main.py`:
- Add async helpers:
  - `taobao_click_extract(url)` -> call `taobao.tbk.item.click.extract` with `click_url` and `adzone_id`
  - `taobao_item_details(item_id)` -> call `taobao.tbk.item.details.upgrade.get` with `item_id`
- Replace old HTML-scrape `/api/taobao/product` with:
  - request body accepts `item_id` or `open_iid`
  - response normalized to `{ title, cover, price, commissionRate, shopName, materialUrl }`
- Add `/api/taobao/resolve` endpoint:
  - input `{ url }`, output `{ itemId, openIid, sourceLink }`

**Step 4: Run test to verify it passes**

Run: `python -m pytest backend/tests/test_taobao_endpoints.py -q`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/main.py backend/tests/test_taobao_endpoints.py
git commit -m "feat: add taobao resolve and details endpoints"
```

---

### Task 3: Wire Taobao parsing in ProductFormModal (frontend)

**Files:**
- Modify: `src/components/archive/ProductFormModal.tsx`
- Test: `src/components/archive/ProductFormModal.test.tsx`

**Step 1: Write the failing test**

Add a test that mocks:
- `apiRequest('/api/taobao/resolve')` -> `{ itemId: "123" }`
- `apiRequest('/api/taobao/product')` -> `{ title: "T", cover: "img", price: "9.9", commissionRate: "12.3%" }`
Then input taobao link and assert fields update.

**Step 2: Run test to verify it fails**

Run: `npm.cmd test -- ProductFormModal.test.tsx`
Expected: FAIL (no taobao parsing flow)

**Step 3: Write minimal implementation**

In `ProductFormModal.tsx`:
- Add `isTaobaoLink` matcher (taobao/tmall/click/uland)
- Add `resolveTaobaoLink(url)` -> call `/api/taobao/resolve`
- Add `fetchTaobaoProduct(itemId)` -> call `/api/taobao/product`
- In parse handler:
  - If taobao link: resolve -> fetch -> merge values
  - Respect existing “do not overwrite title/cover if already present” logic

**Step 4: Run test to verify it passes**

Run: `npm.cmd test -- ProductFormModal.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ProductFormModal.tsx src/components/archive/ProductFormModal.test.tsx
git commit -m "feat: add taobao parsing in product form"
```

---

### Task 4: Wire Taobao parsing in CommissionPageContent

**Files:**
- Modify: `src/components/commission/CommissionPageContent.tsx`
- Test: `src/components/commission/CommissionPageContent.test.tsx` (new or existing)

**Step 1: Write the failing test**

Add a test that feeds taobao link into parsing flow and asserts:
- `apiRequest('/api/taobao/resolve')` called
- `apiRequest('/api/taobao/product')` called
- item fields filled with taobao response

**Step 2: Run test to verify it fails**

Run: `npm.cmd test -- CommissionPageContent.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

In `CommissionPageContent.tsx`:
- Add `fetchTaobaoProduct` parallel to `fetchJdProduct`
- In `fetchCommissionProduct` branch on `isTaobaoLink`
  - resolve -> details -> map normalized fields
- Update progress summary counts to include taobao success/failure results

**Step 4: Run test to verify it passes**

Run: `npm.cmd test -- CommissionPageContent.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/commission/CommissionPageContent.tsx src/components/commission/CommissionPageContent.test.tsx
git commit -m "feat: add taobao parsing in commission page"
```

---

### Task 5: Quick integration check + cleanup

**Files:**
- Modify: `docs/UNMIGRATED_FEATURES.md` (if needed)
- Optional: `docs/skills/skills.md` (if you track changes)

**Step 1: Run focused tests**

Run:
- `python -m pytest backend/tests/test_taobao_api.py -q`
- `python -m pytest backend/tests/test_taobao_endpoints.py -q`
- `npm.cmd test -- ProductFormModal.test.tsx`
- `npm.cmd test -- CommissionPageContent.test.tsx`

**Step 2: Commit**

```bash
git add docs/UNMIGRATED_FEATURES.md
git commit -m "docs: note taobao parsing support" || echo "no doc change"
```

---

## Notes
- This plan assumes no git worktree (per user request). If needed, confirm before branching.
- Env vars required: `TAOBAO_APP_KEY`, `TAOBAO_APP_SECRET`, `TAOBAO_SESSION`, `TAOBAO_ADZONE_ID`.
- Existing `/api/taobao/product` HTML scrape should be replaced with official API usage.

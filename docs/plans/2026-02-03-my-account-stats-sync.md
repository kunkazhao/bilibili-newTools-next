# My Account Video Stats Sync Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fetch per-video stat data during sync so like/favorite counts are stored and rendered in the My Account video list.

**Architecture:** Sync flow pulls vlist first, then fetches `/archive/stat` per bvid and merges stat fields into `build_account_video_payload`. Frontend simply renders `favorite` from stats.

**Tech Stack:** FastAPI + aiohttp (backend), React + Vitest (frontend)

### Task 1: Add backend failing test for stat merge during sync

**Files:**
- Create: `backend/tests/test_account_video_sync_stats.py`

**Step 1: Write the failing test**

```python
import unittest
import asyncio

from main import sync_account_videos_for_account


class FakeClient:
    def __init__(self):
        self.upsert_rows = None

    async def select(self, table, params=None):
        return []

    async def upsert(self, table, rows, on_conflict=None):
        self.upsert_rows = rows


class AccountVideoSyncStatsTests(unittest.TestCase):
    def test_sync_uses_stat_fields_for_like_and_favorite(self):
        import main

        async def fake_fetch_videos(mid, page=1, page_size=20):
            return [
                {
                    "bvid": "BV1TEST",
                    "title": "Test",
                    "play": "1",
                    "comment": "2",
                }
            ]

        async def fake_fetch_stat(bvid):
            return {"view": 321, "like": 9, "favorite": 4, "danmaku": 7, "reply": 6}

        main.fetch_account_videos_from_bili = fake_fetch_videos
        main.fetch_account_video_stat = fake_fetch_stat

        client = FakeClient()
        asyncio.run(sync_account_videos_for_account(client, "acc-1", "https://space.bilibili.com/123"))

        self.assertIsNotNone(client.upsert_rows)
        stats = client.upsert_rows[0]["stats"]
        self.assertEqual(stats.get("like"), 9)
        self.assertEqual(stats.get("favorite"), 4)
        self.assertEqual(stats.get("danmaku"), 7)
        self.assertEqual(stats.get("reply"), 6)
        self.assertEqual(stats.get("view"), 321)


if __name__ == "__main__":
    unittest.main()
```

**Step 2: Run test to verify it fails**

Run: `python backend/tests/test_account_video_sync_stats.py`
Expected: FAIL because sync does not use `fetch_account_video_stat` yet.

### Task 2: Implement backend stat fetch + merge

**Files:**
- Modify: `backend/main.py`

**Step 1: Add stat fetch helper**

```python
async def fetch_account_video_stat(bvid: str) -> Optional[Dict[str, Any]]:
    if not bvid:
        return None
    url = "https://api.bilibili.com/x/web-interface/archive/stat"
    params = {"bvid": bvid}
    headers = build_bilibili_headers({"Referer": "https://www.bilibili.com/"})
    async with aiohttp.ClientSession() as session:
        async with session.get(url, headers=headers, params=params, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            data = await resp.json()
            if data.get("code") != 0:
                return None
            return data.get("data") or None
```

**Step 2: Wire stat fetch into sync loop**

```python
for item in vlist:
    stat = await fetch_account_video_stat(item.get("bvid") or "")
    payload_row = build_account_video_payload(account_id, item, stat)
```

**Step 3: Run test to verify it passes**

Run: `python backend/tests/test_account_video_sync_stats.py`
Expected: PASS

### Task 3: Add frontend failing test for favorite stats

**Files:**
- Modify: `src/components/my-account/MyAccountPageView.test.tsx`

**Step 1: Adjust test setup to render cards and assert favorite**

```tsx
const baseProps = {
  ...,
  accounts: [{ id: "a1", name: "Test" }],
  currentAccountId: "a1",
}

expect(screen.getByText(" ’≤ÿ 12")).toBeTruthy()
```

**Step 2: Run test to verify it fails**

Run: `npm test -- MyAccountPageView.test.tsx`
Expected: FAIL because favorite is not rendered yet.

### Task 4: Implement favorite rendering + type updates

**Files:**
- Modify: `src/components/my-account/MyAccountPageView.tsx`
- Modify: `src/components/my-account/types.ts`

**Step 1: Add favorite to stats type**

```ts
stats?: { view?: number; like?: number; reply?: number; danmaku?: number; favorite?: number } | null
```

**Step 2: Render favorite count in card stats row**

```tsx
<span> ’≤ÿ {formatNumber(video.stats?.favorite)}</span>
```

**Step 3: Run test to verify it passes**

Run: `npm test -- MyAccountPageView.test.tsx`
Expected: PASS

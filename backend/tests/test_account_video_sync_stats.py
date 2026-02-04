import asyncio
import sys
from pathlib import Path
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1]))

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

        async def fake_fetch_stat(bvid, session=None):
            return {"view": 321, "like": 9, "favorite": 4, "danmaku": 7, "reply": 6}

        original_fetch_videos = main.fetch_account_videos_from_bili
        original_fetch_stat = getattr(main, "fetch_account_video_stat", None)
        try:
            main.fetch_account_videos_from_bili = fake_fetch_videos
            main.fetch_account_video_stat = fake_fetch_stat

            client = FakeClient()
            asyncio.run(
                sync_account_videos_for_account(
                    client, "acc-1", "https://space.bilibili.com/123"
                )
            )
        finally:
            main.fetch_account_videos_from_bili = original_fetch_videos
            if original_fetch_stat is None:
                delattr(main, "fetch_account_video_stat")
            else:
                main.fetch_account_video_stat = original_fetch_stat

        self.assertIsNotNone(client.upsert_rows)
        stats = client.upsert_rows[0]["stats"]
        self.assertEqual(stats.get("like"), 9)
        self.assertEqual(stats.get("favorite"), 4)
        self.assertEqual(stats.get("danmaku"), 7)
        self.assertEqual(stats.get("reply"), 6)
        self.assertEqual(stats.get("view"), 321)


if __name__ == "__main__":
    unittest.main()

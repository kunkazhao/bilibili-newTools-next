import sys
from pathlib import Path
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import normalize_account_video


class AccountVideoStatsTests(unittest.TestCase):
    def test_fills_danmaku_from_payload_when_missing(self):
        row = {
            "id": "v1",
            "account_id": "a1",
            "bvid": "BV1TEST",
            "stats": {"view": 100, "like": None, "reply": 3},
            "payload": {"video_review": 12},
        }

        result = normalize_account_video(row)

        self.assertIn("stats", result)
        self.assertEqual(result["stats"].get("view"), 100)
        self.assertEqual(result["stats"].get("danmaku"), 12)

    def test_payload_uses_stat_fields_for_like_and_favorite(self):
        from main import build_account_video_payload

        item = {
            "bvid": "BV1TEST",
            "title": "Test",
            "play": "123",
            "comment": "5",
        }
        stat = {"view": 321, "like": 9, "favorite": 4, "danmaku": 7, "reply": 6}

        payload = build_account_video_payload("acc-1", item, stat)

        self.assertIsNotNone(payload)
        stats = payload["stats"]
        self.assertEqual(stats.get("view"), 321)
        self.assertEqual(stats.get("reply"), 6)
        self.assertEqual(stats.get("like"), 9)
        self.assertEqual(stats.get("favorite"), 4)
        self.assertEqual(stats.get("danmaku"), 7)

    def test_payload_preserves_zero_stat_values(self):
        from main import build_account_video_payload

        item = {
            "bvid": "BV1TEST",
            "play": "5",
            "comment": "2",
            "like": 99,
            "favorite": 12,
            "video_review": 3,
        }
        stat = {"view": 0, "like": 0, "favorite": 0, "danmaku": 0, "reply": 0}

        payload = build_account_video_payload("acc-1", item, stat)

        self.assertIsNotNone(payload)
        stats = payload["stats"]
        self.assertEqual(stats.get("view"), 0)
        self.assertEqual(stats.get("reply"), 0)
        self.assertEqual(stats.get("like"), 0)
        self.assertEqual(stats.get("favorite"), 0)
        self.assertEqual(stats.get("danmaku"), 0)


if __name__ == "__main__":
    unittest.main()

import asyncio
import sys
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.append(str(Path(__file__).resolve().parents[1]))

import core


class _FakeClient:
    def __init__(self):
        self.calls = []

    async def select(self, table, params=None):
        self.calls.append((table, params or {}))
        if table == "sourcing_categories":
            return [
                {
                    "id": "p1",
                    "name": "parent",
                    "sort_order": 10,
                    "parent_id": None,
                    "spec_fields": [],
                    "created_at": "2026-02-01T00:00:00Z",
                    "updated_at": "2026-02-01T00:00:00Z",
                },
                {
                    "id": "c1",
                    "name": "child",
                    "sort_order": 20,
                    "parent_id": "p1",
                    "spec_fields": [],
                    "created_at": "2026-02-01T00:00:00Z",
                    "updated_at": "2026-02-01T00:00:00Z",
                },
            ]
        if table == "benchmark_entries":
            return [
                {
                    "id": "e1",
                    "category_id": "c1",
                    "title": "test video",
                    "link": "https://www.bilibili.com/video/BV1xx",
                    "created_at": "2026-02-01T00:00:00Z",
                }
            ]
        raise AssertionError(f"unexpected table: {table}")


class BenchmarkStateCategorySourceTests(unittest.TestCase):
    def test_fetch_benchmark_snapshot_uses_sourcing_categories(self):
        fake_client = _FakeClient()

        with patch.object(core, "ensure_supabase", return_value=fake_client):
            result = asyncio.run(core.fetch_benchmark_snapshot())

        self.assertTrue(result["categories"])
        self.assertEqual(result["categories"][1]["parent_id"], "p1")
        self.assertEqual(result["entries"][0]["category_id"], "c1")

        called_tables = [table for table, _ in fake_client.calls]
        self.assertIn("sourcing_categories", called_tables)
        self.assertNotIn("benchmark_categories", called_tables)


if __name__ == "__main__":
    unittest.main()

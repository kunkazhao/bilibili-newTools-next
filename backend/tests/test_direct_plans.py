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
            await direct_plans.create_direct_plan(
                {"platform": "", "category": "A", "brand": "B"}
            )
        self.assertEqual(ctx.exception.status_code, 400)

    async def test_create_requires_plan_link(self):
        with self.assertRaises(HTTPException) as ctx:
            await direct_plans.create_direct_plan(
                {"platform": "JD", "category": "A", "brand": "B", "plan_link": ""}
            )
        self.assertEqual(ctx.exception.status_code, 400)

    async def test_update_rejects_empty_plan_link(self):
        with self.assertRaises(HTTPException) as ctx:
            await direct_plans.update_direct_plan(
                "p1", direct_plans.DirectPlanUpdate(plan_link="")
            )
        self.assertEqual(ctx.exception.status_code, 400)

    async def test_create_sets_sort_order_to_top(self):
        self.client.rows = [{"sort_order": 20, "created_at": "2026-02-01"}]
        payload = {
            "platform": "京东",
            "category": "耳机",
            "brand": "X",
            "commission_rate": "20%",
        }
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

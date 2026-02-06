import sys
from pathlib import Path
import unittest

from fastapi import HTTPException

sys.path.append(str(Path(__file__).resolve().parents[1]))

import main


class _FakeSupabaseClient:
    def __init__(self):
        self.upsert_table = ""
        self.upsert_payload = None
        self.upsert_conflict = ""
        self.insert_payload = None
        self.deleted_filters = None
        self.select_rows = {
            "entry-1": {
                "id": "entry-1",
                "account_id": "acc-1",
                "category_id": "cat-1",
                "product_id": "prod-1",
                "sku_id": "sku-1",
                "source_link": "https://item.jd.com/100148265520.html",
                "platform": "jd",
                "remark": None,
            }
        }

    async def select(self, table, params=None):
        if table != "blue_link_map_entries":
            return []
        params = params or {}
        entry_filter = str(params.get("id") or "")
        if entry_filter.startswith("eq."):
            key = entry_filter[3:]
            row = self.select_rows.get(key)
            return [row] if row else []
        return list(self.select_rows.values())

    async def upsert(self, table, payload, on_conflict=None):
        self.upsert_table = table
        self.upsert_payload = payload
        self.upsert_conflict = on_conflict or ""
        if isinstance(payload, list):
            return payload
        return [dict(payload, id="entry-1")]

    async def insert(self, table, payload):
        self.insert_payload = payload
        return payload

    async def delete(self, table, filters):
        self.deleted_filters = filters


class BlueLinkMapBatchUpsertTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        super().setUp()
        self.client = _FakeSupabaseClient()
        self._orig_ensure = main.ensure_supabase
        self._orig_now = main.utc_now_iso
        main.ensure_supabase = lambda: self.client
        main.utc_now_iso = lambda: "2026-02-07T08:30:00Z"

    def tearDown(self):
        main.ensure_supabase = self._orig_ensure
        main.utc_now_iso = self._orig_now
        super().tearDown()

    async def test_batch_upsert_uses_platform_in_conflict_key(self):
        payload = main.BlueLinkMapBatchPayload(
            entries=[
                main.BlueLinkMapEntryPayload(
                    account_id="acc-1",
                    category_id="cat-1",
                    product_id="prod-1",
                    source_link="https://item.jd.com/100148265520.html",
                ),
                main.BlueLinkMapEntryPayload(
                    account_id="acc-1",
                    category_id="cat-1",
                    product_id="prod-1",
                    source_link="https://detail.tmall.com/item.htm?id=881167534932",
                ),
            ]
        )

        await main.batch_upsert_blue_link_map_entries(payload)

        self.assertEqual(self.client.upsert_table, "blue_link_map_entries")
        self.assertEqual(self.client.upsert_conflict, "account_id,product_id,platform")
        self.assertIsInstance(self.client.upsert_payload, list)
        self.assertEqual(len(self.client.upsert_payload), 2)

        platforms = {str(row.get("platform")) for row in self.client.upsert_payload}
        self.assertEqual(platforms, {"jd", "tb"})


    async def test_batch_upsert_rejects_invisible_blank_link(self):
        payload = main.BlueLinkMapBatchPayload(
            entries=[
                main.BlueLinkMapEntryPayload(
                    account_id="acc-1",
                    category_id="cat-1",
                    source_link="⠀",
                )
            ]
        )

        with self.assertRaises(HTTPException) as ctx:
            await main.batch_upsert_blue_link_map_entries(payload)
        self.assertEqual(ctx.exception.status_code, 400)


    async def test_batch_upsert_rejects_non_url_text(self):
        payload = main.BlueLinkMapBatchPayload(
            entries=[
                main.BlueLinkMapEntryPayload(
                    account_id="acc-1",
                    category_id="cat-1",
                    source_link="2??????????",
                )
            ]
        )

        with self.assertRaises(HTTPException) as ctx:
            await main.batch_upsert_blue_link_map_entries(payload)
        self.assertEqual(ctx.exception.status_code, 400)

    async def test_patch_entry_upsert_uses_platform_in_conflict_key(self):
        payload = main.BlueLinkMapEntryUpdate(
            product_id="prod-2",
            source_link="https://detail.tmall.com/item.htm?id=881167534932",
        )

        await main.patch_blue_link_map_entry("entry-1", payload)

        self.assertEqual(self.client.upsert_table, "blue_link_map_entries")
        self.assertEqual(self.client.upsert_conflict, "account_id,product_id,platform")
        self.assertIsInstance(self.client.upsert_payload, dict)
        self.assertEqual(self.client.upsert_payload.get("platform"), "tb")


if __name__ == "__main__":
    unittest.main()

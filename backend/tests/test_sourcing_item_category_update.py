import sys
from pathlib import Path
import unittest

from fastapi import HTTPException

sys.path.append(str(Path(__file__).resolve().parents[1]))

import backend.api.sourcing as sourcing


def get_model_fields(model):
    return getattr(model, "model_fields", None) or getattr(model, "__fields__", {})


class _DummyRequest:
    async def json(self):
        return {}


class _FakeSupabaseClient:
    def __init__(self, categories=None):
        self.categories = categories if categories is not None else [{"id": "cat-new"}]
        self.update_calls = []

    async def select(self, table, params=None):
        if table == "sourcing_categories":
            if params and params.get("id") == "eq.cat-new":
                return list(self.categories)
            return []
        return []

    async def update(self, table, payload, filters):
        self.update_calls.append((table, payload, filters))
        row = {
            "id": "item-1",
            "category_id": payload.get("category_id", "cat-old"),
            "title": "Item A",
            "spec": {},
        }
        return [row]


class SourcingItemCategoryUpdateTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        super().setUp()
        self._orig_ensure = sourcing.ensure_supabase
        self._orig_sync = sourcing.sync_scheme_item_fields

    def tearDown(self):
        sourcing.ensure_supabase = self._orig_ensure
        sourcing.sync_scheme_item_fields = self._orig_sync
        super().tearDown()

    def test_update_model_includes_category_id(self):
        fields = get_model_fields(sourcing.SourcingItemUpdate)
        self.assertIn("category_id", fields)

    async def test_patch_item_updates_category_id(self):
        fake_client = _FakeSupabaseClient()
        sourcing.ensure_supabase = lambda: fake_client
        sourcing.sync_scheme_item_fields = lambda *args, **kwargs: None

        payload = sourcing.SourcingItemUpdate(category_id="cat-new")
        response = await sourcing.patch_sourcing_item("item-1", payload, _DummyRequest())

        self.assertEqual(response["item"]["category_id"], "cat-new")
        self.assertTrue(fake_client.update_calls)
        _, update_payload, _ = fake_client.update_calls[0]
        self.assertEqual(update_payload.get("category_id"), "cat-new")

    async def test_patch_item_rejects_missing_category(self):
        fake_client = _FakeSupabaseClient(categories=[])
        sourcing.ensure_supabase = lambda: fake_client
        sourcing.sync_scheme_item_fields = lambda *args, **kwargs: None

        payload = sourcing.SourcingItemUpdate(category_id="cat-new")
        with self.assertRaises(HTTPException) as ctx:
            await sourcing.patch_sourcing_item("item-1", payload, _DummyRequest())

        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()

import sys
from pathlib import Path
import unittest
import asyncio
from unittest.mock import AsyncMock, patch

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import (
  normalize_sourcing_item,
  SourcingItemCreate,
  SourcingItemUpdate,
  SOURCING_LIST_FIELDS,
  taobao_item_details,
)


def get_model_fields(model):
  return getattr(model, "model_fields", None) or getattr(model, "__fields__", {})


class SourcingTaobaoLinkTests(unittest.TestCase):
  def test_models_include_taobao_link(self):
    fields_create = get_model_fields(SourcingItemCreate)
    fields_update = get_model_fields(SourcingItemUpdate)
    self.assertIn("taobao_link", fields_create)
    self.assertIn("taobao_link", fields_update)

  def test_normalize_includes_taobao_link(self):
    row = {
      "id": "item-1",
      "category_id": "cat-1",
      "taobao_link": "https://item.taobao.com/item.htm?id=1",
      "spec": {},
    }
    normalized = normalize_sourcing_item(row)
    self.assertEqual(
      normalized.get("taobao_link"),
      "https://item.taobao.com/item.htm?id=1",
    )

  def test_list_fields_include_taobao_link(self):
    self.assertIn("taobao_link", SOURCING_LIST_FIELDS.split(","))

  def test_taobao_item_details_includes_sales(self):
    fake_response = {
      "tbk_item_details_upgrade_get_response": {
        "results": {
          "n_tbk_item": [
            {
              "title": "测试商品",
              "pict_url": "https://example.com/cover.png",
              "zk_final_price": "99.9",
              "volume": 1234,
              "publish_info": {"income_info": {"commission_rate": "12.3"}},
            }
          ]
        }
      }
    }

    async_mock = AsyncMock(return_value=fake_response)
    with patch("main.taobao_api_request", new=async_mock):
      result = asyncio.run(taobao_item_details("123"))
      self.assertEqual(result.get("sales30"), 1234)


if __name__ == "__main__":
  unittest.main()

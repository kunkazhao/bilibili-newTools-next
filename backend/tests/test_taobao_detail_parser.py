import sys
from pathlib import Path
import unittest
import asyncio
from unittest.mock import AsyncMock, patch

sys.path.append(str(Path(__file__).resolve().parents[1]))

from backend.api import commission


class TaobaoDetailParserTests(unittest.TestCase):
    def test_extract_taobao_sku_id_from_url(self):
        url = (
            "https://detail.tmall.com/item.htm?id=928503460622"
            "&skuId=5984860336814&spm=test"
        )
        self.assertEqual(
            commission.extract_taobao_sku_id_from_url(url),
            "5984860336814",
        )

    def test_parse_taobao_detail_html_uses_sku_price(self):
        html = (
            '{"itemName":"ATK ??U2V2????????????????????????",'
            '"skuCore":{"sku2info":{'
            '"5984860336814":{"price":{"priceText":"352"},"subPrice":{"priceText":"299.2"}},'
            '"5811018145970":{"price":{"priceText":"219"},"subPrice":{"priceText":"186.15"}}'
            '}}}'
        )
        parsed = commission.parse_taobao_detail_html(html, "5984860336814")
        self.assertEqual(parsed.get("title"), "ATK ??U2V2????????????????????????")
        self.assertEqual(parsed.get("price"), "299.2")

    @patch("backend.api.commission.fetch_taobao_detail_fallback", new_callable=AsyncMock)
    @patch("backend.api.commission.taobao_item_details", new_callable=AsyncMock)
    def test_taobao_product_info_uses_fallback_html_when_api_fails(self, mock_details, mock_fallback):
        mock_details.side_effect = RuntimeError("permission denied")
        mock_fallback.return_value = {
            "title": "ATK ??U2V2????????????????????????",
            "price": "186.15",
            "materialUrl": "https://detail.tmall.com/item.htm?id=928503460622&skuId=5811018145970",
        }

        result = asyncio.run(
            commission.taobao_product_info(
                {
                    "item_id": "928503460622",
                    "source_url": "https://detail.tmall.com/item.htm?id=928503460622&skuId=5811018145970",
                }
            )
        )

        self.assertEqual(result.get("title"), "ATK ??U2V2????????????????????????")
        self.assertEqual(result.get("price"), "186.15")
        self.assertEqual(result.get("itemId"), "928503460622")


if __name__ == "__main__":
    unittest.main()

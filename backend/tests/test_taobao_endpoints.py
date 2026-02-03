import sys
from pathlib import Path
import unittest
import asyncio
from unittest.mock import AsyncMock, patch

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import taobao_click_extract, taobao_item_details


class TaobaoEndpointsTests(unittest.TestCase):
    @patch("main.taobao_api_request", new_callable=AsyncMock)
    def test_click_extract_maps_item_id(self, mock_call):
        mock_call.return_value = {
            "tbk_item_click_extract_response": {"data": {"item_id": "123"}}
        }
        result = asyncio.run(taobao_click_extract("https://item.taobao.com/item.htm?id=123"))
        self.assertEqual(result.get("itemId"), "123")

    @patch("main.taobao_api_request", new_callable=AsyncMock)
    def test_item_details_maps_commission_rate(self, mock_call):
        mock_call.return_value = {
            "tbk_item_details_upgrade_get_response": {
                "results": {
                    "n_tbk_item": [
                        {
                            "title": "X",
                            "pict_url": "img",
                            "publish_info": {"income_info": {"commission_rate": "1550"}},
                        }
                    ]
                }
            }
        }
        result = asyncio.run(taobao_item_details("123"))
        self.assertEqual(result.get("commissionRate"), "15.5%")


if __name__ == "__main__":
    unittest.main()

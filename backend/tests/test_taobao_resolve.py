import sys
from pathlib import Path
import unittest

from fastapi import HTTPException

sys.path.append(str(Path(__file__).resolve().parents[1]))

import main


class TaobaoResolveTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        super().setUp()
        self._orig_resolve = main.resolve_taobao_url
        self._orig_extract = main.taobao_click_extract

    def tearDown(self):
        main.resolve_taobao_url = self._orig_resolve
        main.taobao_click_extract = self._orig_extract
        super().tearDown()

    def test_extract_taobao_tar_target(self):
        url = (
            "https://s.click.tmall.com/g?et=test"
            "&tar=https%3A%2F%2Fdetail.tmall.com%2Fitem.htm%3Fid%3D1000225673799%26ak%3D27696150"
        )
        self.assertEqual(
            main.extract_taobao_tar_target(url),
            "https://detail.tmall.com/item.htm?id=1000225673799&ak=27696150",
        )

    async def test_resolve_falls_back_to_item_id_from_resolved_url(self):
        async def fake_resolve(url: str):
            return (
                "https://detail.tmall.com/item.htm?abbucket=10&id=881167534932&pisk=test",
                "",
            )

        async def fake_click_extract(url: str):
            return {"itemId": "", "openIid": "", "sourceLink": url}

        main.resolve_taobao_url = fake_resolve
        main.taobao_click_extract = fake_click_extract

        payload = await main.taobao_resolve({"url": "https://b23.tv/mall-demo"})

        self.assertEqual(payload.get("itemId"), "881167534932")
        self.assertEqual(
            payload.get("resolvedUrl"),
            "https://detail.tmall.com/item.htm?abbucket=10&id=881167534932&pisk=test",
        )

    async def test_resolve_requires_url(self):
        with self.assertRaises(HTTPException) as ctx:
            await main.taobao_resolve({"url": ""})
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(str(ctx.exception.detail), "Missing url")


if __name__ == "__main__":
    unittest.main()

import asyncio
import sys
from pathlib import Path
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1]))

import main


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def json(self, *args, **kwargs):
        return self._payload


class _RecordingSession:
    def __init__(self):
        self.calls = []

    def get(self, url, **kwargs):
        self.calls.append({"url": url, **kwargs})
        if "/x/frontend/finger/spi" in url:
            payload = {"code": 0, "data": {"b_3": "BUVID3", "b_4": "BUVID4"}}
        elif "/x/space/wbi/arc/search" in url:
            payload = {
                "code": 0,
                "message": "OK",
                "data": {"list": {"vlist": [{"bvid": "BV1TEST", "title": "Test"}]}}
            }
        else:
            payload = {"code": 0, "data": {}}
        return _FakeResponse(payload)


class BilibiliSpaceFetchRiskBypassTests(unittest.TestCase):
    def test_fetch_account_videos_uses_fingerprint_cookie_and_risk_params(self):
        original_fetch_wbi_keys = main.fetch_wbi_keys
        original_encode_wbi_params = main.encode_wbi_params
        original_bilibili_cookie = main.BILIBILI_COOKIE

        async def fake_fetch_wbi_keys(force=False):
            return {"img_key": "img", "sub_key": "sub"}

        def fake_encode(params, img_key, sub_key):
            return dict(params)

        main.fetch_wbi_keys = fake_fetch_wbi_keys
        main.encode_wbi_params = fake_encode
        main.BILIBILI_COOKIE = ""

        try:
            session = _RecordingSession()
            asyncio.run(main.fetch_account_videos_from_bili("123", session=session))
        finally:
            main.fetch_wbi_keys = original_fetch_wbi_keys
            main.encode_wbi_params = original_encode_wbi_params
            main.BILIBILI_COOKIE = original_bilibili_cookie

        self.assertTrue(any("/x/frontend/finger/spi" in call["url"] for call in session.calls))

        arc_call = next(call for call in session.calls if "/x/space/wbi/arc/search" in call["url"])
        params = arc_call.get("params") or {}

        self.assertIn("platform", params)
        self.assertIn("web_location", params)
        self.assertIn("dm_img_list", params)
        self.assertIn("dm_img_str", params)
        self.assertIn("dm_cover_img_str", params)
        self.assertIn("dm_img_inter", params)

        headers = arc_call.get("headers") or {}
        self.assertIn("Cookie", headers)
        self.assertIn("buvid3=BUVID3", headers.get("Cookie", ""))
        self.assertIn("buvid4=BUVID4", headers.get("Cookie", ""))


if __name__ == "__main__":
    unittest.main()

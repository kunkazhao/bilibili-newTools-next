import asyncio
import unittest

from backend.services import bilibili_account


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    async def json(self, *args, **kwargs):
        return self._payload


class _RiskSession:
    def __init__(self, risk_message: str):
        self.risk_message = risk_message

    def get(self, url, **kwargs):
        if "/x/frontend/finger/spi" in url:
            payload = {"code": 0, "data": {"b_3": "BUVID3", "b_4": "BUVID4"}}
        elif "/x/space/wbi/arc/search" in url:
            payload = {"code": -352, "message": self.risk_message}
        else:
            payload = {"code": 0, "data": {}}
        return _FakeResponse(payload)


class BilibiliRiskFallbackTests(unittest.TestCase):
    def test_is_risk_error_message_matches_common_formats(self):
        self.assertTrue(bilibili_account.is_risk_error_message("风控校验失败"))
        self.assertTrue(
            bilibili_account.is_risk_error_message(
                "请求过于频繁，请稍后重试"
            )
        )
        self.assertTrue(
            bilibili_account.is_risk_error_message(
                "\u98ce\u63a7\u6821\u9a8c\u5931\u8d25"
            )
        )
        self.assertFalse(
            bilibili_account.is_risk_error_message("普通网络异常")
        )

    def test_fetch_account_videos_falls_back_when_risk_message_detected(self):
        original_space_fetch = bilibili_account.fetch_account_videos_from_space_page
        original_browser_cookie = bilibili_account.fetch_bilibili_runtime_cookie_from_space_page
        original_sleep = bilibili_account.asyncio.sleep

        async def fake_space_fetch(mid, page=1, page_size=20):
            return [{"bvid": "BV_FROM_FALLBACK", "title": "fallback"}]

        async def fake_browser_cookie(mid):
            return None

        async def fast_sleep(_seconds):
            return None

        async def fake_fetch_wbi_keys(force=False):
            return {"img_key": "img", "sub_key": "sub"}

        def fake_encode(params, img_key, sub_key):
            return dict(params)

        def fake_headers(extra=None):
            return {"User-Agent": "test"}

        bilibili_account.fetch_account_videos_from_space_page = fake_space_fetch
        bilibili_account.fetch_bilibili_runtime_cookie_from_space_page = fake_browser_cookie
        bilibili_account.asyncio.sleep = fast_sleep

        try:
            session = _RiskSession("风控校验失败")
            videos = asyncio.run(
                bilibili_account.fetch_account_videos_from_bili(
                    "123",
                    session=session,
                    fetch_wbi_keys_fn=fake_fetch_wbi_keys,
                    encode_wbi_params_fn=fake_encode,
                    build_bilibili_headers_fn=fake_headers,
                    bilibili_cookie="",
                )
            )
        finally:
            bilibili_account.fetch_account_videos_from_space_page = original_space_fetch
            bilibili_account.fetch_bilibili_runtime_cookie_from_space_page = original_browser_cookie
            bilibili_account.asyncio.sleep = original_sleep

        self.assertEqual(len(videos), 1)
        self.assertEqual(videos[0]["bvid"], "BV_FROM_FALLBACK")


if __name__ == "__main__":
    unittest.main()

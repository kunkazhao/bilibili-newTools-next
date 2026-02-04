import asyncio
import sys
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import fetch_account_video_stat


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    async def json(self):
        return self._payload

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


class FakeSession:
    def __init__(self, responses):
        self._responses = responses

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    def get(self, url, headers=None, params=None, timeout=None):
        payload = self._responses.get(url)
        if callable(payload):
            payload = payload(params or {})
        return FakeResponse(payload)


class AccountVideoStatFetchTests(unittest.TestCase):
    def test_fallbacks_to_view_when_stat_missing(self):
        import main

        stat_url = "https://api.bilibili.com/x/web-interface/archive/stat"
        view_url = "https://api.bilibili.com/x/web-interface/view"
        responses = {
            stat_url: {"code": -404, "message": "not found"},
            view_url: {"code": 0, "data": {"stat": {"like": 9, "favorite": 3}}},
        }
        fake_session = FakeSession(responses)

        with patch.object(main.aiohttp, "ClientSession", return_value=fake_session):
            result = asyncio.run(fetch_account_video_stat("BV1TEST"))

        self.assertIsNotNone(result)
        self.assertEqual(result.get("like"), 9)
        self.assertEqual(result.get("favorite"), 3)


if __name__ == "__main__":
    unittest.main()

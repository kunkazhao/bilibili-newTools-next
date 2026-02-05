import sys
from pathlib import Path
import unittest


sys.path.append(str(Path(__file__).resolve().parents[1]))

import os
import main
from main import (
    fetch_search_results_for_keyword,
    fetch_question_stats,
    fetch_question_stats_via_api,
    collect_search_payloads,
    fetch_search_results_via_api,
    get_zhihu_search_headers,
    extract_zhihu_questions,
)


class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    async def json(self):
        return self._payload


class _FakeExpectResponse:
    def __init__(self, page, payload):
        self._page = page
        self._payload = payload

    async def __aenter__(self):
        self._page.expect_entered = True
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False

    @property
    async def value(self):
        return _FakeResponse(self._payload)


class _FakePage:
    def __init__(self):
        self.goto_called = False
        self.expect_entered = False
        self.expect_before_goto = False
        self.wait_calls = 0

    def expect_response(self, predicate, timeout=None):
        self.expect_before_goto = not self.goto_called
        return _FakeExpectResponse(self, {"data": [{"id": "q0"}]})

    async def goto(self, url, wait_until=None):
        self.goto_called = True

    async def evaluate(self, script):
        return None

    async def wait_for_response(self, predicate, timeout=None):
        self.wait_calls += 1
        return _FakeResponse({"data": [{"id": f"q{self.wait_calls}"}]})

    async def wait_for_timeout(self, ms):
        return None


class ZhihuScrapeFetcherTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        super().setUp()
        self._orig_env = dict(os.environ)
        self._orig_cookie = main.ZHIHU_COOKIE
        self._orig_ua = main.ZHIHU_UA

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._orig_env)
        main.ZHIHU_COOKIE = self._orig_cookie
        main.ZHIHU_UA = self._orig_ua
        super().tearDown()

    async def test_fetch_search_results_with_injected_fetcher(self):
        calls = []

        async def fake_fetch(offset: int):
            calls.append(offset)
            return {"data": [{"offset": offset}]}

        items = await fetch_search_results_for_keyword("??", response_fetcher=fake_fetch)
        self.assertEqual(calls, [0, 20, 40])
        self.assertEqual([item["offset"] for item in items], [0, 20, 40])

    async def test_fetch_question_stats_with_injected_fetcher(self):
        async def fake_fetch():
            return {"visit_count": 12, "answer_count": 3}

        data = await fetch_question_stats("123", response_fetcher=fake_fetch)
        self.assertEqual(data.get("visit_count"), 12)
        self.assertEqual(data.get("answer_count"), 3)

    async def test_collect_search_payloads_captures_first_response_before_goto(self):
        page = _FakePage()
        results = await collect_search_payloads(
            page, "https://www.zhihu.com/search?q=keyboard", [0, 20, 40]
        )
        self.assertTrue(page.expect_before_goto)
        self.assertTrue(page.goto_called)
        self.assertEqual([item["id"] for item in results], ["q0", "q1", "q2"])

    async def test_fetch_search_results_via_api_uses_offsets(self):
        calls = []

        async def fake_requester(offset: int, params, headers):
            calls.append((offset, params.get("q"), params.get("t")))
            return {"data": [{"offset": offset}]}

        items = await fetch_search_results_via_api(
            "keyboard", {"x-test": "1"}, requester=fake_requester
        )
        self.assertEqual(
            calls,
            [
                (0, "keyboard", "question"),
                (20, "keyboard", "question"),
                (40, "keyboard", "question"),
            ],
        )
        self.assertEqual([item["offset"] for item in items], [0, 20, 40])

    async def test_fetch_question_stats_via_api_uses_requester(self):
        calls = []

        async def fake_requester(question_id: str, params, headers):
            calls.append((question_id, params.get("include")))
            return {"visit_count": 12, "answer_count": 3}

        data = await fetch_question_stats_via_api(
            "123", {"x-test": "1"}, requester=fake_requester
        )
        self.assertEqual(calls, [("123", "visit_count,answer_count")])
        self.assertEqual(data.get("visit_count"), 12)

    def test_extract_questions_handles_api_shape(self):
        items = [
            {
                "object": {
                    "type": "question",
                    "id": "123",
                    "title": "Test <em>question</em>",
                }
            }
        ]
        results = extract_zhihu_questions(items, limit=50)
        self.assertEqual(
            results,
            [
                {
                    "id": "123",
                    "title": "Test question",
                    "url": "https://www.zhihu.com/question/123",
                }
            ],
        )

    def test_get_zhihu_search_headers_parses_json(self):
        os.environ["ZHIHU_SEARCH_HEADERS"] = '{"x-zse-93":"101_3_3.0"}'
        main.ZHIHU_COOKIE = "a=b"
        main.ZHIHU_UA = "UA"
        headers = get_zhihu_search_headers()
        self.assertEqual(headers.get("x-zse-93"), "101_3_3.0")
        self.assertEqual(headers.get("cookie"), "a=b")
        self.assertEqual(headers.get("User-Agent"), "UA")


if __name__ == "__main__":
    unittest.main()

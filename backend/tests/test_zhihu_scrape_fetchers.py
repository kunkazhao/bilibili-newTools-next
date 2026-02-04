import sys
from pathlib import Path
import unittest


sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import fetch_search_results_for_keyword, fetch_question_stats


class ZhihuScrapeFetcherTests(unittest.IsolatedAsyncioTestCase):
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


if __name__ == "__main__":
    unittest.main()

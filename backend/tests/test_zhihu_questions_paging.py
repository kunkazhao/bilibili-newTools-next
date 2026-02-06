import sys
from pathlib import Path
import unittest
from datetime import date


sys.path.append(str(Path(__file__).resolve().parents[1]))

import main


class _FakeSupabaseClient:
    def __init__(self):
        self.questions = [
            {"id": "q1", "title": "A", "url": "u1", "first_keyword_id": "kw1"},
            {"id": "q2", "title": "B", "url": "u2", "first_keyword_id": None},
            {"id": "q3", "title": "C", "url": "u3", "first_keyword_id": "kw1"},
        ]
        self.count_calls = 0
        self.stats = []

    def _filtered_questions(self, params=None):
        params = params or {}
        rows = list(self.questions)
        id_filter = str(params.get("id") or "")
        if id_filter.startswith("in.(") and id_filter.endswith(")"):
            allowed = {
                value.strip()
                for value in id_filter[4:-1].split(",")
                if value.strip()
            }
            rows = [row for row in rows if str(row.get("id")) in allowed]
        title_filter = str(params.get("title") or "")
        if title_filter.startswith("ilike.*") and title_filter.endswith("*"):
            needle = title_filter[len("ilike.*") : -1].lower()
            rows = [
                row
                for row in rows
                if needle in str(row.get("title") or "").lower()
            ]
        return rows

    def _filtered_stats(self, params=None):
        params = params or {}
        rows = list(self.stats)
        question_filter = str(params.get("question_id") or "")
        if question_filter.startswith("in.(") and question_filter.endswith(")"):
            allowed = {
                value.strip()
                for value in question_filter[4:-1].split(",")
                if value.strip()
            }
            rows = [row for row in rows if str(row.get("question_id")) in allowed]
        order = str(params.get("order") or "")
        if order == "stat_date.desc":
            rows.sort(key=lambda row: str(row.get("stat_date") or ""), reverse=True)
        limit = params.get("limit")
        if limit is not None:
            rows = rows[: int(limit)]
        return rows

    async def count(self, table: str, params=None):
        self.count_calls += 1
        if table != "zhihu_questions":
            return 0
        return len(self._filtered_questions(params))

    async def select(self, table: str, params=None):
        params = params or {}
        if table == "zhihu_questions":
            rows = self._filtered_questions(params)
            limit = int(params.get("limit") or len(rows) or 1)
            offset = int(params.get("offset") or 0)
            return rows[offset : offset + limit]
        if table == "zhihu_question_stats":
            return self._filtered_stats(params)
        if table == "zhihu_keywords":
            return [{"id": "kw1", "name": "kw1-name"}]
        if table == "zhihu_question_keywords":
            if params.get("keyword_id") == "eq.kw1":
                return [{"question_id": "q1"}, {"question_id": "q3"}]
            return []
        return []


class _NoCountClient:
    async def select(self, table: str, params=None):
        return [{"id": "a"}, {"id": "b"}]


class ZhihuQuestionPagingTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        super().setUp()
        self._orig_ensure = main.ensure_supabase
        self._orig_shanghai_today = main.shanghai_today
        self.client = _FakeSupabaseClient()
        main.ensure_supabase = lambda: self.client

    def tearDown(self):
        main.ensure_supabase = self._orig_ensure
        main.shanghai_today = self._orig_shanghai_today
        super().tearDown()

    async def test_returns_pagination_fields(self):
        data = await main.list_zhihu_questions(limit=2, offset=0)
        self.assertIn("items", data)
        self.assertIn("pagination", data)
        pagination = data["pagination"]
        self.assertEqual(pagination.get("total"), 3)
        self.assertEqual(pagination.get("limit"), 2)
        self.assertEqual(pagination.get("offset"), 0)
        self.assertEqual(pagination.get("has_more"), True)
        self.assertEqual(pagination.get("next_offset"), 2)

    async def test_prefers_count_api_for_total(self):
        await main.list_zhihu_questions(limit=1, offset=0)
        self.assertEqual(self.client.count_calls, 1)

    async def test_keyword_filter_keeps_total_in_sync(self):
        data = await main.list_zhihu_questions(keyword_id="kw1", limit=10, offset=0)
        ids = [item.get("id") for item in data.get("items", [])]
        self.assertEqual(ids, ["q1", "q3"])
        self.assertEqual(data.get("total"), 2)

    async def test_uses_latest_two_snapshots_when_today_missing(self):
        main.shanghai_today = lambda: date(2026, 2, 7)
        self.client.stats = [
            {"question_id": "q1", "view_count": 120, "answer_count": 14, "stat_date": "2026-02-06"},
            {"question_id": "q1", "view_count": 100, "answer_count": 10, "stat_date": "2026-02-05"},
            {"question_id": "q2", "view_count": 80, "answer_count": 8, "stat_date": "2026-02-06"},
        ]
        data = await main.list_zhihu_questions(limit=10, offset=0)
        q1 = next(item for item in data.get("items", []) if item.get("id") == "q1")
        q2 = next(item for item in data.get("items", []) if item.get("id") == "q2")
        self.assertEqual(q1.get("view_count_total"), 120)
        self.assertEqual(q1.get("answer_count_total"), 14)
        self.assertEqual(q1.get("view_count_delta"), 20)
        self.assertEqual(q1.get("answer_count_delta"), 4)
        self.assertEqual(q2.get("view_count_total"), 80)
        self.assertEqual(q2.get("answer_count_total"), 8)
        self.assertEqual(q2.get("view_count_delta"), 0)
        self.assertEqual(q2.get("answer_count_delta"), 0)

    async def test_fetch_supabase_count_fallback_to_select(self):
        total = await main.fetch_supabase_count(_NoCountClient(), "zhihu_questions", {"title": "ilike.*A*"})
        self.assertEqual(total, 2)


if __name__ == "__main__":
    unittest.main()

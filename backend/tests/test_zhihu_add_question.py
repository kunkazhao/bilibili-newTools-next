import sys
from datetime import date
from pathlib import Path
import unittest

from fastapi import HTTPException

sys.path.append(str(Path(__file__).resolve().parents[1]))

import main


class _FakeSupabaseClient:
    def __init__(self):
        self.keywords = [{"id": "kw1", "name": "kw1-name"}]
        self.questions = []
        self.keyword_mappings = []
        self.stats = []
        self.request_calls = []

    async def select(self, table: str, params=None):
        params = params or {}
        if table == "zhihu_keywords":
            rows = list(self.keywords)
            keyword_filter = str(params.get("id") or "")
            if keyword_filter.startswith("eq."):
                target = keyword_filter[3:]
                rows = [row for row in rows if str(row.get("id")) == target]
            limit = params.get("limit")
            if limit is not None:
                rows = rows[: int(limit)]
            return rows

        if table == "zhihu_questions":
            rows = list(self.questions)
            question_filter = str(params.get("id") or "")
            if question_filter.startswith("eq."):
                target = question_filter[3:]
                rows = [row for row in rows if str(row.get("id")) == target]
            limit = params.get("limit")
            if limit is not None:
                rows = rows[: int(limit)]
            return rows

        if table == "zhihu_question_stats":
            rows = list(self.stats)
            question_filter = str(params.get("question_id") or "")
            if question_filter.startswith("eq."):
                target = question_filter[3:]
                rows = [row for row in rows if str(row.get("question_id")) == target]
            order = str(params.get("order") or "")
            if order == "stat_date.desc":
                rows.sort(key=lambda row: str(row.get("stat_date") or ""), reverse=True)
            limit = params.get("limit")
            if limit is not None:
                rows = rows[: int(limit)]
            return rows

        return []

    async def request(self, method, table, params=None, json_payload=None, prefer=None):
        payload = dict(json_payload or {})
        self.request_calls.append((method, table, params or {}, payload))

        if table == "zhihu_questions":
            qid = str(payload.get("id") or "")
            existing = next((row for row in self.questions if str(row.get("id")) == qid), None)
            if existing:
                existing.update(payload)
            else:
                self.questions.append(payload)
            return [payload]

        if table == "zhihu_question_keywords":
            key = (str(payload.get("question_id") or ""), str(payload.get("keyword_id") or ""))
            existing = next(
                (
                    row
                    for row in self.keyword_mappings
                    if (
                        str(row.get("question_id") or ""),
                        str(row.get("keyword_id") or ""),
                    )
                    == key
                ),
                None,
            )
            if existing:
                existing.update(payload)
            else:
                self.keyword_mappings.append(payload)
            return [payload]

        if table == "zhihu_question_stats":
            key = (str(payload.get("question_id") or ""), str(payload.get("stat_date") or ""))
            existing = next(
                (
                    row
                    for row in self.stats
                    if (
                        str(row.get("question_id") or ""),
                        str(row.get("stat_date") or ""),
                    )
                    == key
                ),
                None,
            )
            if existing:
                existing.update(payload)
            else:
                self.stats.append(payload)
            return [payload]

        return [payload]


class ZhihuAddQuestionTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        super().setUp()
        self.client = _FakeSupabaseClient()

        self._orig_ensure = main.ensure_supabase
        self._orig_fetch_question_stats = main.fetch_question_stats
        self._orig_fetch_keywords_map = main.fetch_zhihu_keywords_map
        self._orig_today = main.shanghai_today
        self._orig_now = main.utc_now_iso

        main.ensure_supabase = lambda: self.client

        async def _fake_fetch_question_stats(question_id: str):
            return {
                "id": question_id,
                "title": "??????",
                "visit_count": 210,
                "answer_count": 18,
            }

        async def _fake_fetch_keywords_map(client, force: bool = False):
            return {"kw1": "kw1-name"}

        main.fetch_question_stats = _fake_fetch_question_stats
        main.fetch_zhihu_keywords_map = _fake_fetch_keywords_map
        main.shanghai_today = lambda: date(2026, 2, 7)
        main.utc_now_iso = lambda: "2026-02-07T08:30:00Z"

    def tearDown(self):
        main.ensure_supabase = self._orig_ensure
        main.fetch_question_stats = self._orig_fetch_question_stats
        main.fetch_zhihu_keywords_map = self._orig_fetch_keywords_map
        main.shanghai_today = self._orig_today
        main.utc_now_iso = self._orig_now
        super().tearDown()

    async def test_create_question_returns_latest_totals_and_delta(self):
        self.client.stats.append(
            {
                "question_id": "123456",
                "stat_date": "2026-02-06",
                "view_count": 160,
                "answer_count": 11,
            }
        )

        payload = main.ZhihuQuestionCreatePayload(
            question_url="https://www.zhihu.com/question/123456?utm_source=test",
            keyword_id="kw1",
        )
        result = await main.create_zhihu_question(payload)

        self.assertEqual(result.get("is_new"), True)
        item = result.get("item") or {}
        self.assertEqual(item.get("id"), "123456")
        self.assertEqual(item.get("title"), "??????")
        self.assertEqual(item.get("view_count_total"), 210)
        self.assertEqual(item.get("answer_count_total"), 18)
        self.assertEqual(item.get("view_count_delta"), 50)
        self.assertEqual(item.get("answer_count_delta"), 7)
        self.assertEqual(item.get("first_keyword"), "kw1-name")

        touched_tables = [table for _, table, _, _ in self.client.request_calls]
        self.assertIn("zhihu_questions", touched_tables)
        self.assertIn("zhihu_question_keywords", touched_tables)
        self.assertIn("zhihu_question_stats", touched_tables)

    async def test_rejects_invalid_question_url(self):
        payload = main.ZhihuQuestionCreatePayload(
            question_url="https://example.com/not-zhihu",
            keyword_id="kw1",
        )
        with self.assertRaises(HTTPException) as ctx:
            await main.create_zhihu_question(payload)
        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()

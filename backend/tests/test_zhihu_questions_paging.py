import sys
from pathlib import Path
import unittest


sys.path.append(str(Path(__file__).resolve().parents[1]))

import main


class _FakeSupabaseClient:
    def __init__(self):
        self.questions = [
            {"id": "q1", "title": "A", "url": "u1", "first_keyword_id": None},
            {"id": "q2", "title": "B", "url": "u2", "first_keyword_id": None},
            {"id": "q3", "title": "C", "url": "u3", "first_keyword_id": None},
        ]

    async def select(self, table: str, params=None):
        params = params or {}
        if table == "zhihu_questions":
            if "limit" in params or "offset" in params:
                limit = int(params.get("limit") or 50)
                offset = int(params.get("offset") or 0)
                return self.questions[offset : offset + limit]
            return list(self.questions)
        if table == "zhihu_question_stats":
            return []
        if table == "zhihu_keywords":
            return []
        if table == "zhihu_question_keywords":
            return []
        return []


class ZhihuQuestionPagingTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        super().setUp()
        self._orig_ensure = main.ensure_supabase
        main.ensure_supabase = lambda: _FakeSupabaseClient()

    def tearDown(self):
        main.ensure_supabase = self._orig_ensure
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


if __name__ == "__main__":
    unittest.main()

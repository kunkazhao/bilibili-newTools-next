import sys
from pathlib import Path
import unittest
from datetime import date


sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import zhihu_scrape_job


class FakeClient:
    def __init__(self):
        self.select_calls = []
        self.request_calls = []
        self.delete_calls = []

    async def select(self, table, params=None):
        self.select_calls.append((table, params))
        if table == "zhihu_keywords":
            return [
                {"id": "k1", "name": "kw1"},
                {"id": "k2", "name": "kw2"},
            ]
        if table == "zhihu_questions":
            qid = (params or {}).get("id")
            if qid == "eq.2":
                return [{"id": "2", "first_keyword_id": "k1"}]
            return []
        return []

    async def request(self, method, table, params=None, json_payload=None, prefer=None):
        self.request_calls.append((method, table, params or {}, json_payload or {}))
        return []

    async def delete(self, table, filters):
        self.delete_calls.append((table, filters))
        return []


class ZhihuScrapeJobTests(unittest.IsolatedAsyncioTestCase):
    async def test_scrape_job_dedupes_questions(self):
        client = FakeClient()
        detail_calls = []

        def build_item(qid, title):
            return {"object": {"type": "question", "question": {"id": qid, "title": title}}}

        async def search_fetcher(keyword):
            if keyword == "kw1":
                return [build_item(1, "A"), build_item(2, "B")]
            if keyword == "kw2":
                return [build_item(2, "B"), build_item(3, "C")]
            return []

        async def detail_fetcher(qid):
            detail_calls.append(qid)
            return {"visit_count": 100 + int(qid), "answer_count": 10}

        today = date(2026, 2, 5)
        await zhihu_scrape_job(
            client=client,
            search_fetcher=search_fetcher,
            detail_fetcher=detail_fetcher,
            today=today,
            now="2026-02-05T00:00:00Z",
        )

        # detail fetch only once per unique question
        self.assertEqual(set(detail_calls), {"1", "2", "3"})
        self.assertEqual(len(detail_calls), 3)

        question_upserts = [call for call in client.request_calls if call[1] == "zhihu_questions"]
        mapping_upserts = [call for call in client.request_calls if call[1] == "zhihu_question_keywords"]
        stats_upserts = [call for call in client.request_calls if call[1] == "zhihu_question_stats"]

        self.assertEqual(len(question_upserts), 3)
        self.assertEqual(len(mapping_upserts), 4)
        self.assertEqual(len(stats_upserts), 3)

        # cleanup should run
        self.assertTrue(any(call[0] == "zhihu_question_stats" for call in client.delete_calls))

    async def test_scrape_job_includes_existing_questions(self):
        class ExistingClient(FakeClient):
            async def select(self, table, params=None):
                self.select_calls.append((table, params))
                if table == "zhihu_keywords":
                    return [{"id": "k1", "name": "kw1"}]
                if table == "zhihu_question_keywords":
                    if (params or {}).get("keyword_id") == "eq.k1":
                        return [{"question_id": "2"}]
                    return []
                if table == "zhihu_questions":
                    qid = (params or {}).get("id")
                    if qid == "eq.2":
                        return [{"id": "2", "title": "Old", "url": "https://www.zhihu.com/question/2", "first_keyword_id": "k1"}]
                    return []
                return []

        client = ExistingClient()
        detail_calls = []

        def build_item(qid, title):
            return {"object": {"type": "question", "question": {"id": qid, "title": title}}}

        async def search_fetcher(keyword):
            return [build_item(1, "New")]

        async def detail_fetcher(qid):
            detail_calls.append(qid)
            return {"visit_count": 10, "answer_count": 1}

        await zhihu_scrape_job(
            client=client,
            search_fetcher=search_fetcher,
            detail_fetcher=detail_fetcher,
            today=date(2026, 2, 5),
            now="2026-02-05T00:00:00Z",
            keyword_id="k1",
            include_existing=True,
        )

        self.assertEqual(set(detail_calls), {"1", "2"})

    async def test_scrape_job_inserts_question_before_mapping(self):
        class StrictClient(FakeClient):
            def __init__(self):
                super().__init__()
                self.inserted_questions = set()

            async def request(self, method, table, params=None, json_payload=None, prefer=None):
                payload = json_payload or {}
                if table == "zhihu_questions":
                    qid = payload.get("id")
                    if qid:
                        self.inserted_questions.add(str(qid))
                if table == "zhihu_question_keywords":
                    qid = str(payload.get("question_id") or "")
                    if qid and qid not in self.inserted_questions:
                        raise RuntimeError("mapping before question insert")
                return await super().request(method, table, params, json_payload, prefer)

        client = StrictClient()

        def build_item(qid, title):
            return {"object": {"type": "question", "question": {"id": qid, "title": title}}}

        async def search_fetcher(keyword):
            return [build_item(1, "A")]

        async def detail_fetcher(qid):
            return {"visit_count": 1, "answer_count": 1}

        await zhihu_scrape_job(
            client=client,
            search_fetcher=search_fetcher,
            detail_fetcher=detail_fetcher,
            today=date(2026, 2, 5),
            now="2026-02-05T00:00:00Z",
        )


if __name__ == "__main__":
    unittest.main()

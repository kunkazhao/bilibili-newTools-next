import sys
from pathlib import Path
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import parse_cookie_header, extract_zhihu_questions


class ZhihuScrapeHelperTests(unittest.TestCase):
    def test_parse_cookie_header(self):
        cookies = parse_cookie_header("a=1; b=two; invalid; =bad; c=3", ".zhihu.com")
        self.assertEqual(
            cookies,
            [
                {"name": "a", "value": "1", "domain": ".zhihu.com", "path": "/"},
                {"name": "b", "value": "two", "domain": ".zhihu.com", "path": "/"},
                {"name": "c", "value": "3", "domain": ".zhihu.com", "path": "/"},
            ],
        )

    def test_extract_zhihu_questions(self):
        items = [
            {"object": {"type": "question", "question": {"id": 123, "title": "A"}}},
            {"object": {"type": "article", "article": {"id": 999}}},
            {"object": {"type": "question", "question": {"id": 123, "title": "A"}}},
            {"object": {"type": "question", "question": {"id": 456, "title": "B"}}},
            {"object": {"type": "question", "question": {"id": 0, "title": ""}}},
        ]
        result = extract_zhihu_questions(items, limit=1)
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]["id"], "123")
        self.assertEqual(result[0]["title"], "A")
        self.assertTrue(result[0]["url"].endswith("/question/123"))


if __name__ == "__main__":
    unittest.main()

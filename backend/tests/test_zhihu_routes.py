import sys
from pathlib import Path
import unittest

from fastapi.routing import APIRoute

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import app


def has_route(path: str, methods=None) -> bool:
    methods = {m.upper() for m in (methods or {"GET"})}
    for route in app.routes:
        if isinstance(route, APIRoute) and route.path == path:
            route_methods = {m.upper() for m in (route.methods or set())}
            if methods.issubset(route_methods):
                return True
    return False


class ZhihuRouteTests(unittest.TestCase):
    def test_routes_exist(self):
        self.assertTrue(has_route("/api/zhihu/keywords", {"GET"}))
        self.assertTrue(has_route("/api/zhihu/keywords", {"POST"}))
        self.assertTrue(has_route("/api/zhihu/keywords/{keyword_id}", {"PATCH"}))
        self.assertTrue(has_route("/api/zhihu/keywords/{keyword_id}", {"DELETE"}))
        self.assertTrue(has_route("/api/zhihu/keywords/counts", {"GET"}))
        self.assertTrue(has_route("/api/zhihu/questions", {"GET"}))
        self.assertTrue(has_route("/api/zhihu/questions", {"POST"}))
        self.assertTrue(has_route("/api/zhihu/questions/{question_id}/stats", {"GET"}))
        self.assertTrue(has_route("/api/zhihu/scrape/run", {"POST"}))


if __name__ == "__main__":
    unittest.main()

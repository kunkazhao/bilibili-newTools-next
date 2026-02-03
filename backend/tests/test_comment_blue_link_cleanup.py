import sys
from pathlib import Path
import unittest
from fastapi.routing import APIRoute

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import app, CommentComboCreate


def has_route(path: str, methods=None) -> bool:
    methods = {m.upper() for m in (methods or {"GET"})}
    for route in app.routes:
        if isinstance(route, APIRoute) and route.path == path:
            route_methods = {m.upper() for m in (route.methods or set())}
            if methods.issubset(route_methods):
                return True
    return False


class CommentBlueLinkCleanupTests(unittest.TestCase):
    def test_comment_category_routes_removed(self):
        self.assertFalse(has_route("/api/comment/categories", {"POST"}))
        self.assertFalse(has_route("/api/comment/categories/{category_id}", {"DELETE"}))

    def test_comment_combo_create_has_no_category_field(self):
        self.assertNotIn("category_id", CommentComboCreate.model_fields)


if __name__ == "__main__":
    unittest.main()

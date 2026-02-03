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


class MyAccountRouteTests(unittest.TestCase):
    def test_routes_exist(self):
        self.assertTrue(has_route("/api/my-accounts/state", {"GET"}))
        self.assertTrue(has_route("/api/my-accounts/sync", {"POST"}))


if __name__ == "__main__":
    unittest.main()

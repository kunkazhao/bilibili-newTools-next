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


class BlueLinkRouteTests(unittest.TestCase):
  def test_v2_routes_exist(self):
    self.assertTrue(has_route("/api/comment/blue-links/state-v2"))
    self.assertTrue(has_route("/api/blue-link-map/state-v2"))
    self.assertTrue(has_route("/api/blue-link-map/entries/clear", {"POST"}))

  def test_v1_routes_removed(self):
    self.assertFalse(has_route("/api/comment/blue-links/state"))
    self.assertFalse(has_route("/api/blue-link-map/state"))


if __name__ == "__main__":
  unittest.main()

import sys
from pathlib import Path

from fastapi.routing import APIRoute

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import app


def _has_route(path: str, methods=None) -> bool:
    required = {m.upper() for m in (methods or {"GET"})}
    for route in app.routes:
        if not isinstance(route, APIRoute):
            continue
        if route.path != path:
            continue
        route_methods = {m.upper() for m in (route.methods or set())}
        if required.issubset(route_methods):
            return True
    return False


def test_benchmark_routes_keep_state_and_entries_only():
    assert _has_route("/api/benchmark/state")
    assert _has_route("/api/benchmark/entries", {"POST"})
    assert _has_route("/api/benchmark/entries/{entry_id}", {"PATCH"})
    assert _has_route("/api/benchmark/entries/{entry_id}", {"DELETE"})



def test_benchmark_category_routes_removed():
    assert not _has_route("/api/benchmark/categories", {"POST"})
    assert not _has_route("/api/benchmark/categories/{category_id}", {"DELETE"})

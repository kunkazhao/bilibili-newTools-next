from backend import core


def test_rembg_routes_are_removed():
    paths = {route.path for route in core.app.routes}
    assert "/api/rembg/init" not in paths
    assert "/api/rembg/progress" not in paths

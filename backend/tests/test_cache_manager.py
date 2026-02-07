import time

from backend.services.cache import CacheManager


def test_cache_get_with_ttl():
    manager = CacheManager()
    manager.set("ns", data={"ok": True})

    assert manager.get("ns", ttl=1) == {"ok": True}


def test_cache_invalidate():
    manager = CacheManager()
    manager.set("ns", data=1)
    manager.invalidate("ns")

    assert manager.get("ns") is None


def test_cache_max_entries_evicts_oldest():
    manager = CacheManager()
    manager.set("ns", key="a", data=1, max_entries=2)
    time.sleep(0.01)
    manager.set("ns", key="b", data=2, max_entries=2)
    time.sleep(0.01)
    manager.set("ns", key="c", data=3, max_entries=2)

    assert manager.get("ns", key="a") is None
    assert manager.get("ns", key="b") == 2
    assert manager.get("ns", key="c") == 3

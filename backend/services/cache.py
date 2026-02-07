import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, Hashable, Optional


@dataclass
class CacheEntry:
    timestamp: float
    data: Any


class CacheManager:
    def __init__(self) -> None:
        self._store: Dict[str, Dict[Hashable, CacheEntry]] = {}
        self._lock = threading.RLock()

    def get(self, namespace: str, key: Hashable = "payload", ttl: Optional[float] = None) -> Optional[Any]:
        with self._lock:
            bucket = self._store.get(namespace)
            if not bucket:
                return None
            entry = bucket.get(key)
            if not entry:
                return None
            if ttl is not None and time.time() - entry.timestamp >= ttl:
                bucket.pop(key, None)
                return None
            return entry.data

    def set(
        self,
        namespace: str,
        key: Hashable = "payload",
        data: Any = None,
        *,
        max_entries: Optional[int] = None,
    ) -> None:
        with self._lock:
            bucket = self._store.setdefault(namespace, {})
            bucket[key] = CacheEntry(timestamp=time.time(), data=data)
            if max_entries is not None and max_entries > 0 and len(bucket) > max_entries:
                oldest_key = min(bucket.items(), key=lambda item: item[1].timestamp)[0]
                bucket.pop(oldest_key, None)

    def invalidate(self, namespace: str, key: Optional[Hashable] = None) -> None:
        with self._lock:
            if key is None:
                self._store.pop(namespace, None)
                return
            bucket = self._store.get(namespace)
            if not bucket:
                return
            bucket.pop(key, None)
            if not bucket:
                self._store.pop(namespace, None)


cache = CacheManager()

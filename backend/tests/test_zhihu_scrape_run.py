import sys
from pathlib import Path
import unittest

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import app


class ZhihuScrapeRunTests(unittest.TestCase):
    def test_run_returns_started(self):
        with TestClient(app) as client:
            resp = client.post("/api/zhihu/scrape/run")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json().get("status"), "started")


if __name__ == "__main__":
    unittest.main()

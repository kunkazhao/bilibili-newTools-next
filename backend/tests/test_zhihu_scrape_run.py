import sys
from pathlib import Path
import unittest

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import app


class ZhihuScrapeRunTests(unittest.TestCase):
    def test_run_returns_job_id(self):
        with TestClient(app) as client:
            resp = client.post("/api/zhihu/scrape/run?dry_run=1")
        self.assertEqual(resp.status_code, 200)
        payload = resp.json()
        self.assertIsNotNone(payload.get("job_id"))
        self.assertEqual(payload.get("status"), "queued")


if __name__ == "__main__":
    unittest.main()

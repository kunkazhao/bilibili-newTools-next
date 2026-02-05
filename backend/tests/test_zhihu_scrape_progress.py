import sys
from pathlib import Path
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import create_zhihu_job_state, get_zhihu_job_state, update_zhihu_job_state


class ZhihuScrapeProgressTests(unittest.TestCase):
    def test_job_state_updates(self):
        state = create_zhihu_job_state(total=5, keyword_id="k1")
        job_id = state["id"]
        self.assertEqual(state["total"], 5)
        self.assertEqual(state["status"], "queued")

        update_zhihu_job_state(job_id, status="running", processed=2, success=2)
        updated = get_zhihu_job_state(job_id)
        self.assertIsNotNone(updated)
        self.assertEqual(updated["status"], "running")
        self.assertEqual(updated["processed"], 2)
        self.assertEqual(updated["success"], 2)


if __name__ == "__main__":
    unittest.main()

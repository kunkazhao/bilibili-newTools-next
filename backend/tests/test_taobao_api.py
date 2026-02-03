import sys
from pathlib import Path
import unittest
from unittest.mock import patch

sys.path.append(str(Path(__file__).resolve().parents[1]))

import main
from main import build_taobao_signed_params, normalize_taobao_commission_rate


class TaobaoApiHelpersTests(unittest.TestCase):
    def test_normalize_commission_rate(self):
        self.assertEqual(normalize_taobao_commission_rate("1550"), "15.5%")
        self.assertEqual(normalize_taobao_commission_rate(1200), "12%")
        self.assertEqual(normalize_taobao_commission_rate(None), "")

    @patch("main.time.time", return_value=1700000000)
    def test_signing_includes_required_params(self, _):
        with patch.object(main, "TAOBAO_APP_KEY", "test"), patch.object(
            main, "TAOBAO_APP_SECRET", "secret"
        ):
            params = build_taobao_signed_params("test.method", {"item_id": "1"})
        self.assertIn("method", params)
        self.assertIn("sign", params)
        self.assertIn("timestamp", params)


if __name__ == "__main__":
    unittest.main()

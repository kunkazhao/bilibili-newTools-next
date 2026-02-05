import sys
import asyncio
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1]))

import main


class AiFillParamsTests(unittest.TestCase):
    @patch.object(main, "Generation")
    def test_ai_fill_uses_qwen3_max_with_forced_search(self, generation_mock):
        generation_mock.call.return_value = SimpleNamespace(
            status_code=200,
            message="",
            output=SimpleNamespace(
                choices=[
                    {
                        "message": {
                            "content": (
                                '[{"name":"P","佩戴方式":"耳夹式","重量":"","续航":"","降噪":"","发声单元":"","特色功能":""}]'
                            )
                        }
                    }
                ]
            ),
        )

        spec_fields = [
            {"key": "佩戴方式", "example": "耳夹式/入耳式/半入耳式"},
            {"key": "重量", "example": "XXg"},
            {"key": "续航", "example": "XX小时"},
            {"key": "降噪", "example": "主动降噪+通话降噪"},
            {"key": "发声单元", "example": "16.2mm聚能振膜"},
            {"key": "特色功能", "example": "AI翻译，不区分左右耳"},
        ]

        with patch.dict("os.environ", {"DASHSCOPE_API_KEY": "test"}):
            asyncio.run(
                main.ai_fill_product_params("蓝牙耳机", spec_fields, ["P"])
            )

        called_kwargs = generation_mock.call.call_args.kwargs
        self.assertEqual(called_kwargs.get("model"), "qwen3-max-2026-01-23")
        self.assertTrue(called_kwargs.get("enable_search"))
        self.assertEqual(called_kwargs.get("search_options"), {"forced_search": True})


if __name__ == "__main__":
    unittest.main()

import sys
import asyncio
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1]))

import main


class DummyChat:
    def __init__(self):
        self.called_kwargs = None
        self.completions = self

    def create(self, **kwargs):
        self.called_kwargs = kwargs
        return SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content='[{"name":"P","佩戴方式":"","重量":"","续航":"","降噪":"","发声单元":"","特色功能":""}]'
                    )
                )
            ]
        )


class DummyClient:
    def __init__(self):
        self.chat = DummyChat()


class AiFillParamsTests(unittest.TestCase):
    @patch.object(main, "OpenAI")
    def test_ai_fill_uses_qwen3_max_with_forced_search(self, openai_mock):
        dummy_client = DummyClient()
        openai_mock.return_value = dummy_client

        spec_fields = [
            {"key": "佩戴方式", "example": "耳夹式/入耳式/半入耳式"},
            {"key": "重量", "example": "XX克"},
            {"key": "续航", "example": "单次Xh/充电仓Xh"},
            {"key": "降噪", "example": "通话降噪"},
            {"key": "发声单元", "example": "16.2mm聚能振膜"},
            {"key": "特色功能", "example": "AI翻译，不区分左右耳"},
        ]

        with patch.dict("os.environ", {"DASHSCOPE_API_KEY": "test"}):
            asyncio.run(main.ai_fill_product_params("蓝牙耳机", spec_fields, ["P"]))

        called_kwargs = dummy_client.chat.called_kwargs or {}
        self.assertEqual(called_kwargs.get("model"), "qwen3-max-2026-01-23")
        extra_body = called_kwargs.get("extra_body") or {}
        self.assertTrue(extra_body.get("enable_search"))
        self.assertTrue(extra_body.get("enable_source"))
        search_options = extra_body.get("search_options") or {}
        self.assertEqual(search_options.get("forced_search"), True)
        self.assertEqual(search_options.get("search_strategy"), "max")


if __name__ == "__main__":
    unittest.main()

import sys
import asyncio
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1]))

import main


class AiFillParamsModelOverrideTests(unittest.TestCase):
    @patch.object(main, "Generation")
    def test_ai_fill_uses_deepseek_client_when_model_is_deepseek(self, generation_mock):
        generation_mock.call.side_effect = AssertionError("DashScope should not be used for deepseek")

        deepseek_response = SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content='[{"name":"P","佩戴方式":"耳夹式","重量":"","续航":"","降噪":"","发声单元":"","特色功能":""}]'
                    )
                )
            ]
        )
        deepseek_client = SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(
                    create=lambda **kwargs: deepseek_response
                )
            )
        )

        spec_fields = [
            {"key": "佩戴方式", "example": "耳夹式/入耳式/半入耳式"},
            {"key": "重量", "example": "XXg"},
            {"key": "续航", "example": "XX小时"},
            {"key": "降噪", "example": "主动降噪+通话降噪"},
            {"key": "发声单元", "example": "16.2mm聚能振膜"},
            {"key": "特色功能", "example": "AI翻译，不区分左右耳"},
        ]

        with patch.dict("os.environ", {"DEEPSEEK_API_KEY": "test"}), patch.object(
            main, "deepseek_client", deepseek_client
        ):
            asyncio.run(
                main.ai_fill_product_params(
                    "蓝牙耳机",
                    spec_fields,
                    ["P"],
                    model_override="deepseek-chat",
                )
            )


if __name__ == "__main__":
    unittest.main()

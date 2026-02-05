import sys
import asyncio
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1]))

import main


class AiFillParamsGlmTests(unittest.TestCase):
    @patch("main.httpx.post")
    @patch.object(main, "Generation")
    def test_ai_fill_uses_bigmodel_web_search_with_glm(self, generation_mock, httpx_post):
        generation_mock.call.side_effect = AssertionError("DashScope should not be used for GLM")

        web_search_response = SimpleNamespace(
            status_code=200,
            json=lambda: {
                "search_result": [
                    {
                        "title": "t",
                        "content": "c",
                        "link": "https://example.com",
                    }
                ]
            },
        )
        chat_response = SimpleNamespace(
            status_code=200,
            json=lambda: {
                "choices": [
                    {
                        "message": {
                            "content": (
                                '[{"name":"P","wear":"clip","weight":"","battery":"","anc":"","driver":"","features":""}]'
                            )
                        }
                    }
                ]
            },
        )
        httpx_post.side_effect = [web_search_response, chat_response]

        spec_fields = [
            {"key": "wear", "example": "clip/in-ear/semi-in-ear"},
            {"key": "weight", "example": "XXg"},
            {"key": "battery", "example": "XXh"},
            {"key": "anc", "example": "ANC+call"},
            {"key": "driver", "example": "16.2mm"},
            {"key": "features", "example": "multi-point"},
        ]

        with patch.dict("os.environ", {"BIGMODEL_API_KEY": "test"}):
            asyncio.run(
                main.ai_fill_product_params(
                    "bluetooth headset",
                    spec_fields,
                    ["P"],
                    model_override="glm-4.7-FlashX",
                )
            )

        self.assertEqual(httpx_post.call_count, 2)
        web_search_call = httpx_post.call_args_list[0]
        self.assertIn("/web_search", web_search_call.args[0])
        chat_call = httpx_post.call_args_list[1]
        self.assertIn("/chat/completions", chat_call.args[0])

    @patch("main.httpx.post")
    @patch.object(main, "Generation")
    def test_ai_fill_reports_chat_timeout(self, generation_mock, httpx_post):
        generation_mock.call.side_effect = AssertionError("DashScope should not be used for GLM")

        web_search_response = SimpleNamespace(
            status_code=200,
            json=lambda: {
                "search_result": [
                    {
                        "title": "t",
                        "content": "c",
                        "link": "https://example.com",
                    }
                ]
            },
        )

        httpx_post.side_effect = [
            web_search_response,
            main.httpx.ReadTimeout("timeout"),
        ]

        spec_fields = [
            {"key": "wear", "example": "clip/in-ear/semi-in-ear"},
            {"key": "weight", "example": "XXg"},
        ]

        with patch.dict("os.environ", {"BIGMODEL_API_KEY": "test"}):
            with self.assertRaises(main.HTTPException) as ctx:
                asyncio.run(
                    main.ai_fill_product_params(
                        "bluetooth headset",
                        spec_fields,
                        ["P"],
                        model_override="glm-4.7-FlashX",
                    )
                )

        self.assertIn("GLM调用失败", str(ctx.exception.detail))


if __name__ == "__main__":
    unittest.main()

import sys
from pathlib import Path
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1]))

import main


class BilibiliPageNumberTests(unittest.TestCase):
    def test_extract_page_number_defaults_to_one(self):
        self.assertEqual(main.extract_page_number(""), 1)
        self.assertEqual(main.extract_page_number("https://www.bilibili.com/video/BV1xx"), 1)
        self.assertEqual(main.extract_page_number("https://www.bilibili.com/video/BV1xx?p=0"), 1)

    def test_extract_page_number_from_query(self):
        self.assertEqual(main.extract_page_number("https://www.bilibili.com/video/BV1xx?p=3"), 3)
        self.assertEqual(main.extract_page_number("https://www.bilibili.com/video/BV1xx?foo=1&p=12"), 12)


if __name__ == "__main__":
    unittest.main()

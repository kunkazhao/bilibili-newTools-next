import sys
from pathlib import Path
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import extract_mid_from_homepage_link


class MidParseTests(unittest.TestCase):
    def test_extracts_mid_from_space_url(self):
        self.assertEqual(
            extract_mid_from_homepage_link("https://space.bilibili.com/12345"),
            "12345",
        )

    def test_extracts_mid_from_space_url_with_trailing(self):
        self.assertEqual(
            extract_mid_from_homepage_link("https://space.bilibili.com/12345/"),
            "12345",
        )

    def test_extracts_mid_from_plain_number(self):
        self.assertEqual(extract_mid_from_homepage_link("12345"), "12345")

    def test_returns_empty_on_invalid(self):
        self.assertEqual(extract_mid_from_homepage_link("https://example.com/"), "")


if __name__ == "__main__":
    unittest.main()

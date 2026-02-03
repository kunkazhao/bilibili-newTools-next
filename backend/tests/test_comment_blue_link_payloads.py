import sys
from pathlib import Path
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import CommentComboCreate


class CommentBlueLinkPayloadTests(unittest.TestCase):
    def test_category_removed_on_create(self):
        self.assertNotIn("category_id", CommentComboCreate.model_fields)


if __name__ == "__main__":
    unittest.main()

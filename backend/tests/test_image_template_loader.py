import sys
from pathlib import Path
import unittest

sys.path.append(str(Path(__file__).resolve().parents[1]))

import main


class ImageTemplateLoaderTests(unittest.TestCase):
    def test_uses_filename_for_template_name(self):
        templates = main.load_local_image_templates()
        self.assertTrue(templates)
        for template in templates:
            self.assertEqual(template["name"], template["id"])


if __name__ == "__main__":
    unittest.main()

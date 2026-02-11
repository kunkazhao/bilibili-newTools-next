from pathlib import Path
import unittest


class BackendNoPrintTests(unittest.TestCase):
    def test_backend_source_uses_logging_instead_of_print(self):
        backend_root = Path(__file__).resolve().parents[1]
        offenders = []

        for path in backend_root.rglob("*.py"):
            rel = path.relative_to(backend_root)
            if rel.parts and rel.parts[0] == "tests":
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            if "print(" in text:
                offenders.append(str(rel))

        self.assertEqual(offenders, [], f"Found print() usage: {offenders}")


if __name__ == "__main__":
    unittest.main()

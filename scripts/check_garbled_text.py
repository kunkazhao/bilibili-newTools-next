#!/usr/bin/env python3
"""Fail fast when source files contain obvious garbled text placeholders."""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TARGET_DIRS = ("src", "backend")
TARGET_EXTENSIONS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".css",
    ".html",
    ".md",
    ".json",
}
IGNORE_PARTS = {"node_modules", "dist", ".git", "__pycache__", ".venv", "venv", "tests"}

QUESTION_MARKS = re.compile(r"\?{3,}")
LATIN1_MOJIBAKE = re.compile(r"[\u00C0-\u00FF]{2,}")
REPLACEMENT_CHAR = "\uFFFD"


def iter_source_files() -> list[Path]:
    files: list[Path] = []
    for folder in TARGET_DIRS:
        base = ROOT / folder
        if not base.exists():
            continue
        for path in base.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix.lower() not in TARGET_EXTENSIONS:
                continue
            if any(part in IGNORE_PARTS for part in path.parts):
                continue
            name = path.name.lower()
            if ".test." in name or name.endswith(".spec.ts") or name.endswith(".spec.tsx"):
                continue
            files.append(path)
    return files


def main() -> int:
    problems: list[str] = []

    for path in iter_source_files():
        relative = path.relative_to(ROOT)
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            problems.append(f"{relative}: not valid UTF-8")
            continue

        for line_no, line in enumerate(text.splitlines(), start=1):
            if QUESTION_MARKS.search(line):
                problems.append(f"{relative}:{line_no}: contains '???' placeholder")
            if REPLACEMENT_CHAR in line:
                problems.append(f"{relative}:{line_no}: contains replacement char U+FFFD")
            if LATIN1_MOJIBAKE.search(line):
                problems.append(f"{relative}:{line_no}: possible mojibake (latin1 sequence)")

    if not problems:
        print("No garbled text placeholders found.")
        return 0

    print("Found potential garbled text issues:")
    for item in problems:
        print(f"- {item}")
    return 1


if __name__ == "__main__":
    sys.exit(main())

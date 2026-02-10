from pathlib import Path


def test_api_modules_do_not_use_globals_update_injection():
    api_dir = Path("backend/api")
    injection_pattern = "globals().update({k: v for k, v in core.__dict__.items() if not k.startswith(\"_\")})"
    offenders: list[str] = []

    for path in sorted(api_dir.glob("*.py")):
        if path.name in {"__init__.py", "core.py"}:
            continue
        source = path.read_text(encoding="utf-8")
        if injection_pattern in source:
            offenders.append(str(path))

    assert not offenders, (
        "API modules should use explicit imports/helpers instead of globals().update injection: "
        + ", ".join(offenders)
    )

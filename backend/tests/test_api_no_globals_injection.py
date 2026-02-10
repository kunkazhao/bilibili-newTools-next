from pathlib import Path


def test_benchmark_and_commission_do_not_use_globals_update_injection():
    targets = [
        Path("backend/api/benchmark.py"),
        Path("backend/api/commission.py"),
    ]

    for path in targets:
        source = path.read_text(encoding="utf-8")
        assert "globals().update({k: v for k, v in core.__dict__.items() if not k.startswith(\"_\")})" not in source, (
            f"{path} should use explicit imports/helpers instead of globals().update injection"
        )

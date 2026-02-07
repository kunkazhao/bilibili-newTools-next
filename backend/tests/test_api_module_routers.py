from fastapi import APIRouter
import importlib

MODULES = [
    "backend.api.sourcing",
    "backend.api.schemes",
    "backend.api.comment",
    "backend.api.commission",
    "backend.api.zhihu",
    "backend.api.bilibili",
    "backend.api.video",
    "backend.api.benchmark",
    "backend.api.blue_link_map",
]


def test_api_modules_export_router():
    for name in MODULES:
        module = importlib.import_module(name)
        assert hasattr(module, "router"), f"{name} missing router"
        router = getattr(module, "router")
        assert isinstance(router, APIRouter)

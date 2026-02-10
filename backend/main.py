"""
B站电商创作工作台 - 后端服务入口
"""

import logging
import os
import sys
from datetime import datetime

try:
    import core as core_module
except Exception:
    from backend import core as core_module

# Keep backwards compatibility: `import main` should expose the same symbols as core.
globals().update({k: v for k, v in core_module.__dict__.items() if not k.startswith("_")})

if __name__ != "__main__":
    # Return core module object for callers so monkeypatching main.* still affects runtime logic.
    sys.modules[__name__] = core_module


if __name__ == "__main__":
    import uvicorn

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    logger = logging.getLogger(__name__)

    logger.info("%s", "=" * 60)
    logger.info("[B站电商工作台] 后端启动")
    logger.info("[版本] v2.2 - 添加淘宝商品标题获取API (2025-01-07)")
    logger.info("[时间] %s", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    logger.info("%s", "=" * 60)

    backend_host = os.getenv("BACKEND_HOST", "0.0.0.0")
    backend_port = int(os.getenv("BACKEND_PORT", os.getenv("PORT", "8000")))

    uvicorn.run(core_module.app, host=backend_host, port=backend_port)

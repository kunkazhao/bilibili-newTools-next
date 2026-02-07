# Youhua One-Shot Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不改变业务功能和接口协议的前提下，一次性完成 youhua.md 的核心重构项，降低维护成本并提升后续开发效率。

**Architecture:** 采用“兼容优先”的增量重构策略：先统一前端 API 调用入口，再完成页面配置化，随后拆分后端路由与服务，最后统一类型与缓存。每个任务都以“可运行、可回退”为边界，避免大爆炸重写。

**Tech Stack:** React + TypeScript + Vite（前端），FastAPI + Python（后端），pytest / npm test（测试）。

### Task 1: 统一前端 API 客户端（P0）

**Files:**
- Modify: `src/lib/api.ts`
- Modify: `src/components/archive/archiveApi.ts`
- Search/Modify: `src/components/**/*.ts`, `src/components/**/*.tsx`, `src/pages/**/*.ts`, `src/pages/**/*.tsx`
- Test: `src/components/archive/*.test.tsx`（若存在）

**Step 1: 先写/补充失败用例（若缺失）**
- 覆盖 `apiRequest` 的以下行为：
  - 非 2xx 时统一报错（优先 detail/message）
  - 204 返回空对象
  - JSON 解析失败时有兜底
  - 可配置超时并抛出超时错误

**Step 2: 统一 `src/lib/api.ts` 能力**
- 新增 `timeout` 支持（`AbortController`）
- 支持 `FormData`（不要强行写 `Content-Type: application/json`）
- 统一错误解析函数（`detail` / `message` / 纯文本）

**Step 3: 移除重复实现**
- 删除 `src/components/archive/archiveApi.ts` 内部 `apiRequest` 实现
- 改为从 `@/lib/api` 导入

**Step 4: 全局替换调用入口**
- 检查是否还有重复 `fetch + 手工错误处理`，优先收敛到统一入口

**Step 5: 验证**
- Run: `npm test -- --runInBand`（或项目可用测试命令）
- Run: `npm run build`

**Step 6: Commit**
- `git add src/lib/api.ts src/components/archive/archiveApi.ts src/components src/pages`
- `git commit -m "refactor(frontend): unify api request client"`

### Task 2: 页面配置驱动（P0）

**Files:**
- Create: `src/config/pages.ts`
- Modify: `src/App.tsx`
- Modify: `src/components/AppLayout.tsx`
- Test: `src/App.test.tsx`（若存在）

**Step 1: 建立配置单一事实源**
- 在 `src/config/pages.ts` 定义：`id`、`label`、`group`、`component`
- 输出 `PRIMARY_PAGES` 与 `UTILITY_PAGES`

**Step 2: 改造页面渲染逻辑**
- `App.tsx` 用配置映射替代 `switch(activeIndex)`
- 保持现有页面顺序与文案一致

**Step 3: 改造侧边栏菜单**
- `AppLayout.tsx` 改为读取配置渲染按钮
- 不改变 UI 样式，仅替换数据源

**Step 4: 验证**
- Run: `npm run build`
- 手工 smoke：切换所有主功能/小工具菜单，确认页面对应正确

**Step 5: Commit**
- `git add src/config/pages.ts src/App.tsx src/components/AppLayout.tsx`
- `git commit -m "refactor(frontend): drive app pages from config"`

### Task 3: 后端 main.py 路由拆分（P0）

**Files:**
- Create: `backend/api/__init__.py`
- Create: `backend/api/sourcing.py`
- Create: `backend/api/schemes.py`
- Create: `backend/api/comment.py`
- Create: `backend/api/commission.py`
- Create: `backend/api/zhihu.py`
- Create: `backend/api/bilibili.py`
- Create: `backend/api/video.py`
- Modify: `backend/main.py`
- Test: `backend/tests/*.py`

**Step 1: 建立 router 分组骨架**
- 每个模块导出 `router = APIRouter()`
- 先迁移 import 和最稳定接口（只搬运，不改逻辑）

**Step 2: 从 `main.py` 分批迁移路由**
- 每迁移一组（如 sourcing），立即在 `main.py` 注册 `include_router`
- 保证接口 path 与 response 不变

**Step 3: 收敛 `main.py` 职责**
- 仅保留 app 初始化、CORS、中间件、startup/shutdown、router 注册

**Step 4: 验证**
- Run: `python -m py_compile backend/main.py backend/api/*.py`
- Run: `python -m pytest backend/tests`
- Run: 启动后端并 smoke 关键接口（选品、方案、蓝链、知乎）

**Step 5: Commit**
- `git add backend/main.py backend/api backend/tests`
- `git commit -m "refactor(backend): split api routers out of main"`

### Task 4: 统一类型定义（P1，但本次一次性完成核心域）

**Files:**
- Create: `src/types/api/common.ts`
- Create: `src/types/api/sourcing.ts`
- Create: `src/types/api/schemes.ts`
- Create: `src/types/api/commission.ts`
- Create: `src/types/api/index.ts`
- Modify: `src/components/archive/archiveApi.ts`
- Modify: `src/components/**/*.ts`, `src/pages/**/*.ts`

**Step 1: 提取公共类型**
- `PaginationResponse`、`ErrorResponse`、通用实体基础字段

**Step 2: 迁移核心业务类型**
- 选品库、方案、佣金相关类型迁移到 `src/types/api/*`

**Step 3: 清理重复定义**
- 删除接口文件内部重复 `type`（保留必要局部类型）

**Step 4: 验证**
- Run: `npm run build`
- Run: `npm test -- --runInBand`

**Step 5: Commit**
- `git add src/types src/components src/pages`
- `git commit -m "refactor(frontend): centralize api types"`

### Task 5: 缓存管理统一（P1，先接管现有全局缓存）

**Files:**
- Create: `backend/services/cache.py`
- Modify: `backend/main.py`
- Modify: `backend/api/zhihu.py`（若 Task 3 已拆分）
- Modify: `backend/api/sourcing.py`（若 Task 3 已拆分）
- Modify: `backend/api/comment.py`（若 Task 3 已拆分）
- Test: `backend/tests/test_cache*.py`（新增）

**Step 1: 实现轻量缓存管理器**
- 提供 `get/set/invalidate/get_or_compute`，支持 TTL
- 优先保证线程/协程安全（避免重复回源）

**Step 2: 替换现有全局缓存点**
- 替换 `BLUE_LINK_MAP_CACHE`
- 替换 `SOURCING_CATEGORY_COUNT_CACHE`
- 替换 `ZHIHU_KEYWORDS_MAP_CACHE`
- 替换 `SOURCING_ITEMS_CACHE`

**Step 3: 增加最小测试**
- TTL 过期行为
- invalidate 行为
- 并发场景下不重复计算（至少单元级）

**Step 4: 验证**
- Run: `python -m pytest backend/tests -k cache`
- Run: `python -m pytest backend/tests`

**Step 5: Commit**
- `git add backend/services/cache.py backend/main.py backend/api backend/tests`
- `git commit -m "refactor(backend): centralize in-memory cache management"`

### Task 6: 一次性总回归与交付

**Files:**
- Modify: `docs/youhua.md`（可选：补充“已完成”状态）
- Create: `docs/plans/2026-02-06-youhua-one-shot-exec-report.md`

**Step 1: 全量验证**
- Frontend: `npm run build`
- Backend: `python -m pytest backend/tests`
- 手工 smoke：
  - 选品库（列表/编辑/AI 参数）
  - 方案详情（导出、生成链接）
  - 蓝链映射（导入、自动匹配）
  - 知乎雷达（列表优先 + 统计异步）

**Step 2: 输出执行报告**
- 记录变更文件、风险点、已知限制、回滚方式

**Step 3: 最终提交**
- `git add -A`
- `git commit -m "refactor: complete youhua one-shot architecture cleanup"`
- `git push origin master`

## Non-Negotiable Constraints
- 不修改现有 API URL、请求参数、响应字段。
- 不新增数据库迁移。
- 不引入 Redis、消息队列等新基础设施。
- 功能行为必须与重构前一致；出现行为变更视为缺陷。

## Fast Rollback Plan
- 每个 Task 独立提交，出现问题按任务粒度 `git revert <commit>`。
- 优先回滚 Task 5（缓存）和 Task 3（后端拆分），其风险最高。

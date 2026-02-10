# 目录治理与渐进重构 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不影响现有功能和联调效率的前提下，降低项目目录混乱感，建立可持续扩展的前后端目录规范，并把后续重构改为可分批落地。

**Architecture:** 不采用“全扁平化（所有组件一个目录）”，改为“按业务分组 + 组内扁平化 + 公共层抽离”。前端以 `features + shared` 治理，后端继续从 `core.py` 向 `routers/services/integrations` 拆分。全程增量迁移，每个批次可单独回滚。

**Tech Stack:** React + TypeScript + Vite + Vitest, FastAPI + Python + pytest

---

## 设计结论（先定规则）

1. **不采纳全扁平目录**：`src/components/*` 全部打平会导致重名和搜索噪音，长期维护更差。
2. **采纳渐进式结构治理**：
   - 前端：`src/features/<domain>` + `src/shared/{ui,lib}`
   - 后端：`backend/{routers,services,integrations,schemas}`
3. **先规范、后迁移**：先补文档和脚手架，再分模块迁移，避免一次性大搬家。

---

### Task 1: 建立目录治理基线（低风险）

**Files:**
- Modify: `.gitignore`
- Create: `docs/frontend-architecture.md`
- Create: `docs/backend-architecture.md`
- Modify: `docs/README.md`（若不存在则创建）

**Step 1: 清理本地噪音忽略项**
- 在 `.gitignore` 增加 Python 缓存与测试缓存：`__pycache__/`, `*.pyc`, `.pytest_cache/`

**Step 2: 写前端目录治理规范**
- 明确 `pages/features/shared` 分工
- 明确命名规则：`Page / PageContent / PageView / Dialog / api / types / hooks`

**Step 3: 写后端目录治理规范**
- 明确 `main.py/app.py/routers/services/integrations/schemas` 职责

**Step 4: 验证**
- Run: `git status --short`
- 预期：不再出现缓存目录噪音；文档新增可见。

**Step 5: Commit**
- `chore: add frontend/backend architecture conventions`

---

### Task 2: 前端 API 层归拢（不搬组件，先搬调用层）

**Files:**
- Create: `src/api/archive.ts`
- Create: `src/api/commission.ts`
- Create: `src/api/schemes.ts`
- Create: `src/api/zhihu.ts`
- Create: `src/api/blue-link-map.ts`
- Modify: 当前页面/内容组件中的 API import 路径

**Step 1: 先做薄封装 re-export**
- 新建 `src/api/*.ts`，内部暂时 re-export 旧实现，保证零行为变化。

**Step 2: 批量替换 import 引用**
- 把组件中 `components/**/**Api.ts` 引用逐步替换为 `@/api/*`

**Step 3: 验证**
- Run: `npm test`
- Run: `npm run build`
- 预期：测试和构建通过。

**Step 4: Commit**
- `refactor(frontend): unify api imports under src/api`

---

### Task 3: 前端 shared 层固化（保留 ui 子目录）

**Files:**
- Create: `src/shared/lib/index.ts`
- Create: `src/shared/ui/index.ts`
- Modify: `src/components/ui/*`（仅必要导出，不改行为）
- Modify: 引用路径（小步替换）

**Step 1: 保留 `src/components/ui` 不打平**
- 这是通用基础组件层，打平收益低、风险高。

**Step 2: 建 barrel export**
- `src/shared/ui/index.ts` 输出高频组件，统一引用入口。

**Step 3: 验证**
- Run: `npm test`
- Run: `npm run build`

**Step 4: Commit**
- `refactor(frontend): add shared ui/lib export entry`

---

### Task 4: 前端模块试点迁移（先一个域，证明可行）

**Files:**
- Create: `src/features/archive/{components,api,types,hooks,utils}/...`
- Modify: `src/pages/ArchivePage.tsx`
- Modify: 相关 archive imports

**Step 1: 仅迁移 archive 模块的“非页面入口文件”**
- 目标是验证迁移路径，不追求一次性全搬。

**Step 2: 保持对外 API 不变**
- 页面入口仍通过 `src/pages/ArchivePage.tsx`，避免路由层震荡。

**Step 3: 补回归测试**
- 至少覆盖：分类切换、新增商品、来源链接点击、导出入口可渲染。

**Step 4: 验证**
- `npm test`
- `npm run build`

**Step 5: Commit**
- `refactor(frontend): migrate archive domain to feature structure`

---

### Task 5: 后端第二阶段拆分（core -> app/routers/services）

**Files:**
- Create: `backend/app.py`
- Create: `backend/routers/{archive,schemes,commission,zhihu,...}.py`
- Create: `backend/services/{archive,schemes,commission,zhihu,...}.py`
- Create: `backend/integrations/{jd,taobao,bilibili}.py`
- Modify: `backend/main.py`
- Modify: `backend/core.py`（逐步瘦身，最后可移除）

**Step 1: 先拆 app 壳层**
- `main.py` 仅启动；`app.py` 仅组装 FastAPI 和 router。

**Step 2: 按域搬迁接口定义**
- 每次只搬一个域，跑一轮后端测试再继续。

**Step 3: 抽离第三方调用到 integrations**
- JD/淘宝/B站请求逻辑不放在路由文件里。

**Step 4: 验证**
- `python -m pytest backend/tests -q`

**Step 5: Commit（按域小提交）**
- `refactor(backend): split <domain> router/service`

---

### Task 6: 脚本与文档归档治理

**Files:**
- Modify: `scripts/README.md`
- Move/Keep: 所有 bat 保持在 `scripts/`
- Modify: `docs/README.md` 增加“文件去哪找”索引

**Step 1: 脚本分组命名统一**
- `start-*` / `stop-*` 保持成对，注明主分支/稳定版用途。

**Step 2: 写“查找文件 30 秒规则”**
- 页面看 `src/pages`
- 业务看 `src/features/<domain>`
- 公共组件看 `src/shared/ui`
- 后端接口看 `backend/routers`

**Step 3: Commit**
- `docs: add navigation index for project structure`

---

## 验收标准（DoD）

1. 新人 30 秒能定位：页面、接口、业务逻辑、公共组件。
2. `npm test`、`npm run build`、`python -m pytest backend/tests -q` 全绿。
3. 目录改动以“可回滚的小提交”推进，不出现一次性超大重命名提交。
4. 禁止再次出现“缓存目录入库”“脚本散落根目录”“业务代码塞通用层”。

---

## 执行顺序建议（最快可落地）

1. Task 1（规则+基线）
2. Task 2（API 归拢）
3. Task 3（shared 固化）
4. Task 4（archive 试点）
5. Task 5（后端继续拆 core）
6. Task 6（脚本/文档收尾）

> 这套方案会比“全扁平化”慢一点点，但风险更低、返工更少、长期可维护性更高。

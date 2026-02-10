# Task List

## P0 - 已完成

- [x] 修复 `npm run build` 的 TypeScript 构建问题（当前已可稳定构建）。
- [x] 修复选品库页面“新增按钮点击无响应”问题。
- [x] 修复蓝链-置顶评论一键提取：补齐 `jump_url` 中的 `b23` 短链提取（含淘宝落地场景，按原短链显示）。

## P1 - 进行中（后端解耦）

- [x] 已按接口分组拆出路由文件到 `backend/api/*.py`。
- [x] 移除各路由模块对 `core` 的 `globals().update(...)` 依赖注入，改为显式导入/服务层调用。
  - [x] `backend/api/direct_plans.py` 已改为显式依赖导入。
  - [x] `backend/api/benchmark.py` 已改为显式依赖导入。
  - [x] `backend/api/commission.py` 已改为显式依赖导入。
  - [x] `backend/api/bilibili.py` 已改为显式依赖导入。
  - [x] `backend/api/blue_link_map.py` 已改为显式依赖导入。
  - [x] `backend/api/comment.py` 已改为显式依赖导入。
  - [x] `backend/api/schemes.py` 已改为显式依赖导入。
  - [x] `backend/api/sourcing.py` 已改为显式依赖导入。
  - [x] `backend/api/video.py` 已改为显式依赖导入。
  - [x] `backend/api/zhihu.py` 已改为显式依赖导入。
- [ ] 将 `backend/core.py` 的业务逻辑继续下沉到 service / utils 层，降低单文件复杂度。
- [ ] 解耦完成后补充回归测试并更新对应文档。

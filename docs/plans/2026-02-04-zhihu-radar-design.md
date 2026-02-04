# 知乎流量雷达（精简监控版）设计

## 目标与范围
- 关键词库作为监控入口；每日定时抓取知乎搜索问题（Top 50/关键词）。
- 仅保留问题（过滤文章/视频等）。
- 监控字段：总阅读量、总回答数、新增阅读量、新增回答数。
- 提供 15 天趋势弹窗。
- 关键词去重合并问题：同一问题多关键词命中仅入库一条；列表显示“首个命中关键词”。
- 数据保留 15 天，抓取完成后清理过期数据。

## 关键决策
- 接口方式：知乎 PC Web API（JSON）。
- 签名方案：Playwright 无头浏览器生成签名（不手写算法）。
- 定时：APScheduler，每天北京时间 05:00。
- 存储：Supabase/Postgres。
- 列表字段：标题、所属分类、总阅读量、总回答数、新增阅读数、新增回答数、操作（趋势图标）。
- UI 复用：左侧分类列表与分类管理弹窗复用“选品库”样式与编辑弹窗；表格优先复用现有 `src/components/Table.tsx`；图标优先用 lucide（shadcn 同源）。

## 数据模型（新增表）
1) `zhihu_keywords`
- `id (uuid)`
- `name (unique)`
- `created_at`, `updated_at`

2) `zhihu_questions`
- `id (question_id, string)`
- `title`
- `url`
- `first_keyword_id`（首个命中关键词）
- `created_at`, `updated_at`, `last_seen_at`

3) `zhihu_question_keywords`（多对多映射）
- `question_id`
- `keyword_id`
- `first_seen_at`, `last_seen_at`
- 约束：`(question_id, keyword_id)` 唯一

4) `zhihu_question_stats`
- `id`
- `question_id`
- `stat_date (YYYY-MM-DD)`
- `view_count`
- `answer_count`
- `fetched_at`
- 约束：`(question_id, stat_date)` 唯一（用于 upsert）

## API 设计
- 关键词 CRUD
  - `GET /api/zhihu/keywords`
  - `POST /api/zhihu/keywords`
  - `PATCH /api/zhihu/keywords/{id}`
  - `DELETE /api/zhihu/keywords/{id}`

- 列表（支持关键词与搜索过滤）
  - `GET /api/zhihu/questions?keyword_id=&q=&limit=&offset=`
  - 返回字段：
    - `title, url, first_keyword`
    - `view_count_total`（当日快照）
    - `answer_count_total`（当日快照）
    - `view_count_delta`（今日-昨日）
    - `answer_count_delta`（今日-昨日）

- 趋势
  - `GET /api/zhihu/questions/{id}/stats?days=15`
  - 返回 15 天 `view_count` 时间序列（必要时可扩展 `answer_count`）

- 手动触发（调试）
  - `POST /api/zhihu/scrape/run`

- 健康状态（可选）
  - `GET /api/zhihu/health` 返回最近抓取状态与错误信息

## 抓取与定时任务
- Playwright 启动单例 Chromium（headless），创建带 Cookie/UA 的 context。
- 对每个关键词：
  - 在页面内请求 `search_v3`（Top 50）并解析 JSON。
  - 过滤 `object.type=question`。
- 问题详情：
  - 通过页面内 JS 请求 `https://www.zhihu.com/api/v4/questions/{id}?include=...` 获取 `visit_count`/`answer_count`。
  - 若接口无需签名，可切换到 `context.request` 以降成本。
- 并发与重试：
  - 关键词并发 2~3；详情并发 6~10（可配置）。
  - 失败重试 2 次，指数退避。
- 幂等写入：
  - `zhihu_questions` 按 `question_id` upsert；`first_keyword_id` 首次写入后不改。
  - `zhihu_question_stats` 按 `(question_id, stat_date)` upsert。
- 清理：抓取完成后删除 `stat_date < today-15`。
- 定时：APScheduler，`Asia/Shanghai` 每天 05:00。

## 前端页面
- 新增“知乎流量雷达”页面（路由待定）。
- 左侧：关键词列表与管理（复用选品库样式与编辑弹窗）。
- 顶部：新增关键词按钮 + 搜索框。
- 中部表格：
  - 标题（外链）、所属分类、总阅读量、总回答数、新增阅读数、新增回答数、操作。
  - 新增字段按值大小应用不同 class（如 `growth-high/mid/low`）。
- 操作：趋势图标按钮，弹窗显示 15 天阅读量折线。

## 配置与依赖
- `.env.local`：`ZHIHU_COOKIE`（已本地保存）；可选 `ZHIHU_UA`。
- 新增依赖：Playwright + 浏览器安装脚本（需要在部署流程中执行）。

## 错误处理与降级
- 403/401：标记 Cookie/签名失效，停止本轮并记录错误。
- 429：降低并发 + 延迟重试；仍失败则记录部分失败。
- 前端可展示“最近抓取状态/失败提示”。

## 测试建议
- 后端：关键词 CRUD、列表聚合（总/增量）、趋势接口、清理逻辑、抓取幂等性。
- 前端：分类切换/搜索过滤/表格渲染/趋势弹窗。

## 后续实现步骤（高层）
1) 迁移表结构与索引
2) 抓取任务（Playwright + API 解析）
3) API 与聚合查询
4) 前端页面与弹窗
5) 任务调度与清理

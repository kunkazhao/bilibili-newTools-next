# 项目 Skill 列表与使用说明

本文档汇总当前项目可用的 skill，并说明其作用与使用方法。

## 通用使用约定

- **触发条件**：当任务与 skill 描述匹配（哪怕只有 1% 可能性）或用户点名 skill 时，必须先使用该 skill。
- **调用方式**：`~/.codex/superpowers/.codex/superpowers-codex use-skill <skill-name>`
- **使用顺序**：流程类 skill 优先（如 brainstorming、debugging、TDD），再执行具体实现类 skill。

---

## 技能清单

### .system/skill-creator
- 作用：创建或更新自定义 skill 的指南与规范。
- 使用方法：在“需要新增或修改 skill”时先调用。

### .system/skill-installer
- 作用：安装/列出可用的 skill，支持从仓库安装。
- 使用方法：需要安装或管理 skill 时调用。

### 00-getting-started
- 作用：Makepad 开发入门与起步流程。
- 使用方法：开始 Makepad 项目或需要了解基础流程时调用。

### 01-core
- 作用：Makepad 核心概念（布局、控件、事件、样式）。
- 使用方法：需要了解基础 UI 机制时调用。

### 02-components
- 作用：Makepad 内置组件与用法参考。
- 使用方法：需要查询可用组件时调用。

### 03-graphics
- 作用：Makepad 绘制、SDF、动画与视觉效果。
- 使用方法：涉及图形渲染、动画效果时调用。

### 04-patterns
- 作用：Makepad 组件开发与数据管理的通用模式。
- 使用方法：需要架构或可复用模式时调用。

### 05-deployment
- 作用：Makepad 应用打包与部署（桌面、移动、Web）。
- 使用方法：需要发布或打包时调用。

### 06-reference
- 作用：Makepad 参考资料、排错与响应式布局模式。
- 使用方法：遇到疑难或需要规范对照时调用。

### 99-evolution
- 作用：Makepad 自我演进技能体系（自校验、自修正等）。
- 使用方法：需要跟进/修正 Makepad 相关流程时调用。

### export-scheme-items-json
- 作用：导出方案商品为 JSON（含参数/备注/featured/JD 链接）。
- 使用方法：执行方案商品导出任务时调用。

### frontend-design
- 作用：高质量前端界面设计与实现指导。
- 使用方法：需要制作 UI 组件/页面/应用时调用。

### product-image-template-batch
- 作用：批量生成/校验方案商品图模板（带绑定字段规则）。
- 使用方法：新增或批量处理商品图模板时调用。

### replace-sourcing-covers-by-uid
- ??????? UID ???????/????????? `SB005-xxx`??
- ??????????? `UID-??` ????? UID ??????????

### ai-params-by-category
- 作用：通过千问联网搜索获取品类商品参数，支持单个/批量/指定商品，返回预览供确认后写入数据库。
- 使用方法：
  1. 调用 POST /api/sourcing/items/ai-fill，传入 category_id、mode(single/batch/selected)、product_names
  2. 获取 AI 返回的参数预览（preview 数组）
  3. 用户确认后调用 POST /api/sourcing/items/ai-confirm 写入数据库
- Prompt 特点：极简 JSON 输出，无多余解释，只填充预设字段
- API 返回格式：{"preview": [...], "spec_fields": [...], "count": N}

### superpowers:brainstorming
- 作用：在任何“创作型/新增功能/行为修改”前进行需求澄清与设计探索。
- 使用方法：开始实现前先调用，完成问题澄清、方案对比与设计输出。

### superpowers:dispatching-parallel-agents
- 作用：拆分为可并行子任务的场景下进行协作分配。
- 使用方法：有 2+ 独立子任务时调用。

### superpowers:executing-plans
- 作用：执行既定实施计划，带检查点。
- 使用方法：已有详细计划需要落地时调用。

### superpowers:finishing-a-development-branch
- 作用：实现完成后收尾（合并、PR、清理等）。
- 使用方法：功能完成并通过测试后调用。

### superpowers:receiving-code-review
- 作用：处理收到的代码审查意见，严格验证再修改。
- 使用方法：收到 review 意见后调用。

### superpowers:requesting-code-review
- 作用：请求代码审查前自检与整理。
- 使用方法：完成重要改动准备 review 时调用。

### superpowers:subagent-driven-development
- 作用：多子任务并行实施的执行指导。
- 使用方法：需要“计划 + 子任务并行”执行时调用。

### superpowers:systematic-debugging
- 作用：系统化排错流程（找根因、再修复）。
- 使用方法：出现 bug/异常/测试失败时调用。

### superpowers:test-driven-development
- 作用：强制 TDD（先写失败测试再写实现）。
- 使用方法：实现功能或修复 bug 前调用。

### superpowers:using-superpowers
- 作用：每次会话开头，确保先加载技能系统。
- 使用方法：在任何响应之前调用。

### superpowers:verification-before-completion
- 作用：完成前必须验证（运行测试/构建）再声明完成。
- 使用方法：准备宣告完成或提交前调用。

### superpowers:writing-plans
- 作用：把需求转成可执行的实施计划。
- 使用方法：多步骤改动且未形成计划时调用。

### superpowers:writing-skills
- 作用：编写/修改/验证 skill。
- 使用方法：需要改 skill 本身时调用。

### superpowers:【禁用】using-git-worktrees
- 作用：使用 git worktree 进行隔离开发（当前被禁用）。
- 使用方法：此 skill 标注为禁用，不应执行。

---

## 已记录的易错点（请避免重复）

### 2026-02-03 京东推广链接解析报“未找到商品信息”
- 现象：在“推广链接”里粘贴 union-click/jdc/jingfen 链接，点击解析后提示“未找到商品信息”。
- 根因：先解析成 `item.jd.com` 后再用 SKU 调 `/api/jd/product`，当后端未配置 `JD_SCENE_ID` 时会返回 411。
- 正确处理：对 `union-click/jdc/jingfen` 这类推广链接，**keyword 必须使用原始推广链接**；解析后的 `item.jd.com` 只用于保存标准链接（蓝链）与展示。

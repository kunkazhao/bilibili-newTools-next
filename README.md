# bilibili-newTools-next

## 项目简介
bilibili-newTools-next 是原 bilibili-newTools 的新前端栈迁移版，使用 Vite + React + TypeScript + Tailwind + shadcn/ui 统一 UI 与组件规范，目标是提升界面一致性、可复用性与交互效率。

## 功能清单（当前状态）

### 已完成迁移
- 获取商品参数（RecognizePage）
  - 图片上传/拖拽识别（/api/image/recognize）
  - 列管理（新增/编辑/删除/拖拽排序/锁定列）
  - 本地缓存与导出 Excel
  - 图片预览/单行删除/清空
- 对标视频收集（BenchmarkPage）
  - 分类与颜色标签、添加/编辑/删除视频、B站信息解析
- 提取视频文案（ScriptPage）
  - 文案提取、视频信息、TXT/DOCX 导出、本地缓存与删除
- 方案详情（SchemeDetailPage）
  - 商品列表筛选/排序/拖拽、导出/下载、飞书同步
  - 文案生成、蓝链生成、图片生成、提示词管理
- 方案操作台（SchemesPage）
  - 分类管理（新增/编辑/删除/排序）、分类筛选、新建/编辑方案校验
  - 骨架屏与异步加载

### 部分迁移（待补）
- 选品库（ArchivePage）
  - 下载图片、写入飞书、批量导入与推广链接解析
- 获取商品佣金（CommissionPage）
  - 链接解析（B站/推广/对标）、清空/下载/导出
- 评论蓝链管理（CommentBlueLinkPage）
  - 分类维度、批量复制/一键提取等扩展操作
- 蓝链商品映射（BlueLinkMapPage）
  - 失败重试、导入明细导出、筛选项与错误提示补齐

### 暂不处理
- 一键加购（AutoCartPage）
- 选品库写入飞书（相关功能）

## 开发说明
- Node 18+ 建议
- 依赖安装：`npm i`
- 本地启动：`npm run dev`


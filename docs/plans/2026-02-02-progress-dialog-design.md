# 统一进度弹窗设计

日期：2026-02-02

## 目标
- 项目内所有“进度类操作”统一使用同一个进度弹窗组件，后续样式与交互只需改一处。
- 支持简版与完整版场景，通过配置开关决定显示内容。

## 统一组件：ProgressDialog
建议新增全局组件 `ProgressDialog`，放置在 `src/components/ProgressDialog.tsx`（或 `src/components/ui/progress-dialog.tsx`）。

### Props（建议）
- `open: boolean`
- `title: string`
- `status: "running" | "done" | "cancelled" | "error"`
- `total: number`
- `processed: number`
- `success?: number`
- `failures?: Array<{ name: string; link?: string; reason?: string }>`
- `showSummary?: boolean`（默认 true，展示“总数/成功/失败”）
- `showFailures?: boolean`（默认 false，展示失败列表）
- `allowCancel?: boolean`（默认 false）
- `showCloseOnDone?: boolean`（默认 true）
- `onCancel?: () => void`
- `onOpenChange?: (open: boolean) => void`

### 行为
- 进度条：`processed / total`，`total=0` 时显示 0%。
- 运行中：展示“处理中… 已处理 x / y”。
- 完成/取消：展示“完成 / 已取消”。
- 失败列表：可滚动容器，避免弹窗过高。
- 按钮区：运行中显示“取消”，完成后显示“关闭”。

## 落地范围（A/B/C）
### A. 识别页（Recognize）
- 触发点：批量识别开始时打开进度弹窗。
- `total = files.length`，每处理完一张 `processed++`。
- 失败项记录：`文件名 + 错误原因`。
- 允许取消：取消后停止后续文件处理，已处理结果保留。

### B. 方案详情（SchemeDetail）
- **生成图片**：强制接入进度弹窗。
  - `total = items.length`，每生成一张 `processed++`，失败记录商品名与原因。
  - 允许取消：取消后停止后续渲染，已生成的仍可下载。
- 文本生成（标题/简介/投票/评论回复）：保持 toast，不强制进度弹窗。
- 蓝链生成：同步操作，默认不接入。

### C. 选品库（Archive）
- **导入**：替换现有 `ImportProgressModal` 为统一 `ProgressDialog`。
- **导出**：若导出条目多，显示进度（按行处理），否则仅 toast。

## 错误与取消
- 失败项单独记录，运行完成后显示失败列表。
- 取消后状态为 `cancelled`，按钮改为“关闭”。

## 测试建议
- 组件：渲染简版/完整版、进度条 0/100、取消与完成按钮切换。
- 识别页：批量识别进度递增，失败列表可见。
- 方案详情：生成图片进度递增，取消可中断后续处理。
- 选品库：导入进度弹窗替换成功，导出可控。

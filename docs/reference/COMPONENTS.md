# 组件清单（面向非技术）

> 目的：让非技术同学也能快速知道“这个项目有哪些组件、长什么样、在哪个页面用”。
> 页面名称以左侧菜单中文为准；“方案详情页”是独立打开的新页面（无侧边栏）。

## 页面入口（src/pages）

这些文件只是“页面入口壳”，真正内容在 `src/components/pages`。

- ArchivePage：选品库入口
- SchemesPage：方案操作台入口
- SchemeDetailPage：方案详情页入口（独立页）
- CommissionPage：获取商品佣金入口
- RecognizePage：获取商品参数入口
- BenchmarkPage：对标视频收集入口
- CommentBlueLinkPage：评论蓝链管理入口
- BlueLinkMapPage：蓝链商品映射入口
- ScriptPage：提取视频文案入口
- AutoCartPage：一键加购入口

## 页面内容容器（src/components/pages）

> 这一层是页面“内容主体”的 React 组件，基本与 `src/pages` 一一对应。

- ArchivePage：选品库主体容器，负责接入选品库内容组件。页面：选品库
- SchemesPage：方案操作台主体容器。页面：方案操作台
- SchemeDetailPage：方案详情主体容器（无侧边栏布局）。页面：方案详情
- CommissionPage：获取商品佣金主体容器。页面：获取商品佣金
- RecognizePage：获取商品参数主体容器。页面：获取商品参数
- BenchmarkPage：对标视频收集主体容器。页面：对标视频收集
- CommentBlueLinkPage：评论蓝链管理主体容器。页面：评论蓝链管理
- BlueLinkMapPage：蓝链商品映射主体容器。页面：蓝链商品映射
- ScriptPage：提取视频文案主体容器。页面：提取视频文案
- AutoCartPage：一键加购主体容器。页面：一键加购

## 业务模块组件（按文件夹）

### src/components/archive（选品库）

- ArchivePageView：选品库页面的整体布局与分区（头部、列表、侧栏等）。页面：选品库
- ArchivePageContent：选品库的数据与交互逻辑容器。页面：选品库
- ArchiveListCard：选品库“列表模式”商品卡片（含封面、价格/佣金/销量等信息与操作按钮）。页面：选品库
- ArchiveProductCard：选品库“卡片模式”商品卡片（大图+关键字段+操作）。页面：选品库
- ProductFormModal：新增/编辑商品的表单弹窗。页面：选品库
- CategoryManagerModal：分类管理弹窗（可编辑、可拖拽排序）。页面：选品库
- PresetFieldsModal：预设参数管理弹窗（可编辑、可拖拽排序）。页面：选品库
- ImportProgressModal：导入流程的进度弹窗。页面：选品库
- ArchiveDialogs：选品库的“确认类弹窗”（比如清空列表确认）。页面：选品库

### src/components/schemes（方案操作台 / 方案详情）

- SchemesPageView：方案操作台整体布局与分区。页面：方案操作台
- SchemesPageContent：方案操作台的数据与交互逻辑容器。页面：方案操作台
- SchemesDialogs：方案操作台相关弹窗集合（如分类管理/新建）。页面：方案操作台
- SchemeDetailPageView：方案详情页面整体布局（左侧商品列表 + 右侧生成区）。页面：方案详情
- SchemeDetailPageContent：方案详情的数据与交互逻辑容器。页面：方案详情
- SchemeDetailHeader：方案详情页顶部信息区（标题、统计等）。页面：方案详情
- SchemeDetailToolbar：方案详情页操作区（导出、飞书等）。页面：方案详情
- SchemeDetailProductList：方案详情页左侧商品列表（固定高度可滚动）。页面：方案详情
- SchemeDetailSidebar：方案详情右侧“蓝链/生成区”卡片与操作。页面：方案详情
- SchemeDetailDialogs：方案详情相关弹窗（编辑/确认类）。页面：方案详情

### src/components/commission（获取商品佣金）

- CommissionPageView：获取商品佣金的整体布局与分区。页面：获取商品佣金
- CommissionPageContent：获取商品佣金的数据与交互逻辑容器。页面：获取商品佣金
- CommissionListCard：佣金列表的商品卡片（精简信息 + 操作图标）。页面：获取商品佣金
- CommissionEditModal：单条商品的编辑弹窗。页面：获取商品佣金
- CommissionArchiveModal：归档相关弹窗（归档确认/提示）。页面：获取商品佣金
- CommissionProgressModal：处理流程进度弹窗。页面：获取商品佣金
- CommissionResultModal：处理完成结果弹窗。页面：获取商品佣金
- CommissionSelectVideoModal：选择来源视频的弹窗。页面：获取商品佣金
- CommissionDialogs：佣金页面其他确认类弹窗集合。页面：获取商品佣金

### src/components/benchmark（对标视频收集）

- BenchmarkPageView：对标视频收集的整体布局与分区。页面：对标视频收集
- BenchmarkPageContent：对标视频收集的数据与交互逻辑容器。页面：对标视频收集
- BenchmarkDialogs：对标视频相关弹窗（分类管理、取字幕等）。页面：对标视频收集

### src/components/comment-blue-link（评论蓝链管理）

- CommentBlueLinkPageView：评论蓝链管理整体布局。页面：评论蓝链管理
- CommentBlueLinkPageContent：评论蓝链管理的数据与交互逻辑容器。页面：评论蓝链管理
- CommentBlueLinkDialogs：评论蓝链管理相关弹窗（账号/分类管理等）。页面：评论蓝链管理

### src/components/blue-link-map（蓝链商品映射）

- BlueLinkMapPageView：蓝链商品映射的整体布局。页面：蓝链商品映射
- BlueLinkMapPageContent：蓝链商品映射的数据与交互逻辑容器。页面：蓝链商品映射
- BlueLinkMapDialogs：蓝链映射相关弹窗（账号/分类管理、匹配等）。页面：蓝链商品映射

### src/components/recognize（获取商品参数）

- RecognizePageView：获取商品参数页面整体布局。页面：获取商品参数
- RecognizePageContent：获取商品参数的数据与交互逻辑容器。页面：获取商品参数
- RecognizeDialogs：获取商品参数相关弹窗。页面：获取商品参数

### src/components/script（提取视频文案）

- ScriptPageView：提取视频文案页面整体布局。页面：提取视频文案
- ScriptPageContent：提取视频文案的数据与交互逻辑容器。页面：提取视频文案
- ScriptDialogs：提取视频文案相关弹窗（比如结果、确认类）。页面：提取视频文案

### src/components/auto-cart（一键加购）

- AutoCartPageView：一键加购页面布局。页面：一键加购
- AutoCartPageContent：一键加购的数据与交互逻辑容器。页面：一键加购

## 通用组件（src/components 根目录）

这些组件在多个页面复用（页面：多处使用）。

- AppLayout：整站骨架与侧边栏导航（黑色侧栏 + 主内容区）。页面：所有页面
- ActionModal：通用“操作确认”弹窗壳（提示 + 取消/确认）。页面：多处使用
- ModalForm：通用表单弹窗壳（标题 + 内容 + 按钮）。页面：多处使用
- InputGroup：带标签的输入组件（标题 + 输入框 + 错误提示）。页面：多处使用
- Pagination：分页条（上一页/下一页/页码）。页面：多处使用
- PrimaryButton：主按钮样式（突出主操作）。页面：多处使用
- Badge：小标签/角标（彩色状态标签）。页面：多处使用
- Tooltip：悬停提示（鼠标放上显示小提示框）。页面：多处使用
- Empty：空状态提示（图文说明 + 操作按钮）。页面：多处使用
- Skeleton：骨架屏占位（灰色条块）。页面：多处使用
- Table：通用表格（标题 + 行数据）。页面：多处使用
- Tabs：选项卡切换（顶部标签切换内容）。页面：多处使用
- ProductCard：通用商品卡片样式示例（图片 + 标题 + 价格）。页面：示例/演示
- DemoContent：组件展示页（用于演示/调试）。页面：示例/演示
- Toast：通知提示（右上角轻提示）。页面：所有页面

## UI 基础组件（src/components/ui）

这些是 UI 基础控件（多数来自 shadcn 风格），给业务组件复用。

- button：按钮（主按钮/次按钮/图标按钮）。页面：多处使用
- dialog：弹窗框架（标题区 + 内容区 + 按钮区）。页面：多处使用
- alert-dialog：确认类弹窗（强提示 + 确认/取消）。页面：多处使用
- input：单行输入框。页面：多处使用
- textarea：多行输入框。页面：多处使用
- label：表单标签文字。页面：多处使用
- field：表单布局容器（Field/FieldSet）。页面：多处使用
- select：下拉选择框。页面：多处使用
- checkbox：勾选框。页面：多处使用
- slider：滑动条（范围/数值选择）。页面：少量使用
- editable-list-row：可编辑列表行（输入 + 操作按钮 + 拖拽）。页面：分类/账号管理类弹窗

## 第三方组件 / 图标（外部依赖）

- shadcn/ui：项目 UI 基础样式来源（按钮/弹窗/表单等）。页面：全局
- Radix UI：弹窗/下拉/滑块等基础交互能力（被 shadcn 封装）。页面：全局
- lucide-react：统一的线性图标库（编辑、删除、复制等图标）。页面：全局
- sonner：Toast 通知提示的底层库（右上角提示）。页面：全局

---

如需更细的“组件截图版清单”，我可以下一步补一份“带截图/位置标注”的版本。

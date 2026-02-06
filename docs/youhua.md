优化项详细总结
P0 - 立即做
1. 后端代码拆分
当前问题：

backend/main.py 文件超过 5000 行，包含所有路由、模型、业务逻辑
70+ 个路由处理器全部在一个文件中
修改任何功能都需要在巨大文件中定位，容易引入 bug
新增功能时文件越来越大，可维护性持续恶化
当前结构：


backend/
├── main.py              # 5000+ 行，包含所有内容
├── tests/               # 测试文件
└── downloads/           # 下载目录
目标结构：


backend/
├── main.py              # 仅入口：FastAPI 初始化、CORS、startup/shutdown 事件
├── api/
│   ├── __init__.py
│   ├── sourcing.py      # 选品库相关路由（/api/sourcing/*）
│   ├── bilibili.py      # B站相关路由（/api/bilibili/*）
│   ├── schemes.py       # 方案相关路由（/api/schemes/*）
│   ├── commission.py    # 佣金相关路由（/api/jd/*, /api/taobao/*）
│   ├── comment.py       # 评论蓝链路由（/api/comment/*）
│   ├── benchmark.py     # 对标视频路由（/api/benchmark/*）
│   ├── zhihu.py         # 知乎相关路由（/api/zhihu/*）
│   └── video.py         # 视频处理路由（/api/video/*, /api/subtitle/*）
├── models/
│   ├── __init__.py
│   ├── sourcing.py      # 选品库 Pydantic 模型
│   ├── schemes.py       # 方案 Pydantic 模型
│   ├── comment.py       # 评论相关模型
│   └── common.py        # 通用响应模型
├── services/
│   ├── __init__.py
│   ├── supabase.py      # Supabase 客户端封装
│   ├── cache.py         # 缓存管理服务
│   ├── ai_fill.py       # AI 填充服务
│   └── bilibili.py      # B站 API 调用服务
├── utils/
│   ├── __init__.py
│   ├── wbi.py           # B站 WBI 加密工具
│   ├── image.py         # 图片处理工具
│   └── pagination.py    # 分页工具
└── tests/
拆分步骤：

创建 models/ 目录，将所有 Pydantic 模型迁移过去
创建 services/ 目录，将业务逻辑（如 SupabaseClient）迁移过去
创建 api/ 目录，按路由模块拆分
更新 main.py，仅保留应用初始化和路由注册
更新所有 import 语句
预期收益：

文件大小从 5000+ 行降到每个文件 <500 行
新增功能时只需修改对应模块文件
代码审查和协作开发更容易
降低引入 bug 的风险
2. 统一 API 客户端
当前问题：

src/lib/api.ts 有一个 apiRequest 函数
src/components/archive/archiveApi.ts 又定义了一个几乎相同的 apiRequest 函数
错误处理逻辑不一致
修改 API 调用逻辑需要改多处
代码对比：

src/lib/api.ts:


async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  const text = await response.text()
  const data = text ? safeJson(text) : {}
  if (!response.ok) {
    const detail = (data as { detail?: string })?.detail
    throw new Error(detail || `请求失败（${response.status}）`)
  }
  return data as T
}
src/components/archive/archiveApi.ts:


async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `HTTP ${response.status}`)
  }
  // ... 没有 safeJson 处理
}
目标：

删除 archiveApi.ts 中的 apiRequest 函数
增强 lib/api.ts 中的 apiRequest 功能：
统一错误处理
添加超时控制
添加请求拦截器（如添加 auth token）
添加响应日志（开发环境）
所有模块都从 @/lib/api 导入 apiRequest
增强后的 src/lib/api.ts:


interface ApiRequestOptions extends RequestInit {
  timeout?: number
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { timeout = 30000, ...fetchOptions } = options
  
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      ...fetchOptions,
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const error = await parseError(response)
      throw new Error(error.message || `请求失败（${response.status}）`)
    }
    
    // 处理 204 No Content
    if (response.status === 204) {
      return {} as T
    }
    
    return await response.json()
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('请求超时')
    }
    throw error
  }
}

async function parseError(response: Response): Promise<{message: string}> {
  try {
    return await response.json()
  } catch {
    return { message: response.statusText || '未知错误' }
  }
}
预期收益：

消除重复代码
统一错误处理逻辑
更容易添加全局功能（如 auth、日志、监控）
减少维护成本
P1 - 尽快做
3. 配置驱动路由
当前问题：

App.tsx 中用 switch 语句处理页面路由
AppLayout.tsx 中有两份硬编码的菜单项列表
添加新页面需要同时修改两个文件，容易遗漏
当前代码：


// App.tsx
const renderPage = () => {
  switch (activeIndex) {
    case 0: return <ArchivePage />
    case 1: return <SchemesPage onEnterScheme={openSchemeDetailPage} />
    case 2: return <CommentBlueLinkPage />
    // ... 10+ 个 case
  }
}

// AppLayout.tsx
const primaryItems = ["选品库", "方案库", "蓝链-置顶评论", ...]
const utilityItems = ["获取商品佣金", "获取商品参数", ...]
目标：
创建统一的页面配置


// src/config/pages.ts
export interface PageConfig {
  id: string
  label: string
  group: 'primary' | 'utility'
  component: React.LazyExoticComponent<React.ComponentType>
  path?: string  // 未来用于路由
}

export const PAGES: PageConfig[] = [
  {
    id: 'archive',
    label: '选品库',
    group: 'primary',
    component: lazy(() => import('@/pages/ArchivePage')),
  },
  {
    id: 'schemes',
    label: '方案库',
    group: 'primary',
    component: lazy(() => import('@/pages/SchemesPage')),
  },
  // ...
]

export const PRIMARY_PAGES = PAGES.filter(p => p.group === 'primary')
export const UTILITY_PAGES = PAGES.filter(p => p.group === 'utility')

// App.tsx 简化后
const ActivePage = PAGES[activeIndex]?.component || Placeholder

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0)
  
  return (
    <ToastProvider>
      <AppLayout activeIndex={activeIndex} onSelect={setActiveIndex}>
        <Suspense fallback={<LoadingSpinner />}>
          <ActivePage />
        </Suspense>
      </AppLayout>
    </ToastProvider>
  )
}

// AppLayout.tsx 简化后
import { PRIMARY_PAGES, UTILITY_PAGES } from '@/config/pages'

// 渲染时使用配置
{PRIMARY_PAGES.map((page, index) => (
  <button key={page.id} onClick={() => onSelect?.(index)}>
    {page.label}
  </button>
))}
预期收益：

添加新页面只需在 pages.ts 配置中添加一项
菜单和路由自动同步
支持懒加载，提升性能
更容易实现权限控制（配置中加 permission 字段）
4. 统一类型定义
当前问题：

API 响应类型定义分散在各自的 API 文件中
相同的数据结构在不同文件中重复定义
修改 API 字段需要搜索多个文件
问题示例：


// archiveApi.ts
export type ItemResponse = {
  id: string
  category_id: string
  title: string
  // ...
}

// 其他地方可能又有类似定义
目标：
创建统一的类型定义文件


src/types/
├── api/
│   ├── index.ts         # 导出所有类型
│   ├── sourcing.ts      # 选品库相关类型
│   ├── schemes.ts       # 方案相关类型
│   ├── commission.ts    # 佣金相关类型
│   └── common.ts        # 通用类型（分页、错误响应等）
└── index.ts             # 统一导出
示例：


// src/types/api/common.ts
export interface PaginationResponse {
  has_more: boolean
  next_offset: number
  total?: number
}

export interface ErrorResponse {
  detail: string
  code?: string
}

// src/types/api/sourcing.ts
import type { PaginationResponse } from './common'

export interface SourcingCategory {
  id: string
  name: string
  sort_order: number | null
  spec_fields: SpecField[]
}

export interface SourcingItem {
  id: string
  category_id: string
  title: string
  // ...
}

export interface SourcingListResponse extends PaginationResponse {
  items: SourcingItem[]
}
预期收益：

类型定义集中管理
减少重复定义
修改 API 字段时只需改一个文件
更容易实现类型共享
5. 缓存管理重构
当前问题：

缓存散落在全局变量中
没有统一的缓存接口
缓存过期逻辑重复
当前代码：


# main.py
BLUE_LINK_MAP_CACHE: Dict[str, Any] = {"timestamp": 0.0, "data": None}
SOURCING_CATEGORY_COUNT_CACHE: Dict[str, Any] = {"timestamp": 0.0, "data": None}
ZHIHU_KEYWORDS_MAP_CACHE: Dict[str, Any] = {"timestamp": 0.0, "data": None}
SOURCING_ITEMS_CACHE: Dict[Tuple[str, str, int, int, str], Dict[str, Any]] = {}

# 各处都有类似的检查逻辑
if now - ZHIHU_KEYWORDS_MAP_CACHE.get("timestamp", 0.0) < ZHIHU_KEYWORDS_MAP_CACHE_TTL_SECONDS:
    # ...
目标：
创建统一的缓存管理器


# services/cache.py
from typing import Optional, Any, Dict
import time
import threading

class CacheManager:
    def __init__(self):
        self._caches: Dict[str, Dict[str, Any]] = {}
        self._locks: Dict[str, threading.Lock] = {}
    
    def get(self, key: str, ttl: float) -> Optional[Any]:
        cache = self._caches.get(key)
        if cache and time.time() - cache.get("timestamp", 0) < ttl:
            return cache.get("data")
        return None
    
    def set(self, key: str, data: Any) -> None:
        self._caches[key] = {"timestamp": time.time(), "data": data}
    
    def invalidate(self, key: str) -> None:
        self._caches.pop(key, None)
    
    def get_or_compute(self, key: str, ttl: float, compute_fn: Callable[[], Any]) -> Any:
        data = self.get(key, ttl)
        if data is not None:
            return data
        data = compute_fn()
        self.set(key, data)
        return data

# 全局单例
cache = CacheManager()

# 使用示例
# 旧代码
if now - ZHIHU_KEYWORDS_MAP_CACHE.get("timestamp", 0.0) < ZHIHU_KEYWORDS_MAP_CACHE_TTL_SECONDS:
    ZHIHU_KEYWORDS_MAP_CACHE["data"] = await fetch_keywords()
    ZHIHU_KEYWORDS_MAP_CACHE["timestamp"] = now
return ZHIHU_KEYWORDS_MAP_CACHE["data"]

# 新代码
keywords = await cache.get_or_compute(
    "zhihu_keywords_map",
    ZHIHU_KEYWORDS_MAP_CACHE_TTL_SECONDS,
    fetch_keywords
)
预期收益：

缓存逻辑统一，更容易调试
减少重复代码
更容易扩展（如添加 Redis 后端）
更容易添加缓存统计和监控

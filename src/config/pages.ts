import { createElement, lazy, type ReactElement } from "react"
import { openSchemeDetailPage } from "@/utils/standaloneRoutes"

const ArchivePage = lazy(() => import("@/pages/ArchivePage"))
const AutoCartPage = lazy(() => import("@/pages/AutoCartPage"))
const BenchmarkPage = lazy(() => import("@/pages/BenchmarkPage"))
const BlueLinkMapPage = lazy(() => import("@/pages/BlueLinkMapPage"))
const CommentBlueLinkPage = lazy(() => import("@/pages/CommentBlueLinkPage"))
const CommissionPage = lazy(() => import("@/pages/CommissionPage"))
const DirectPlansPage = lazy(() => import("@/pages/DirectPlansPage"))
const MyAccountPage = lazy(() => import("@/pages/MyAccountPage"))
const RecognizePage = lazy(() => import("@/pages/RecognizePage"))
const SchemesPage = lazy(() => import("@/pages/SchemesPage"))
const ScriptPage = lazy(() => import("@/pages/ScriptPage"))
const ZhihuRadarPage = lazy(() => import("@/pages/ZhihuRadarPage"))

export type PageGroup = "primary" | "utility" | "edge"

export interface PageConfig {
  id: string
  label: string
  group: PageGroup
  render: () => ReactElement
}

export const PAGES: PageConfig[] = [
  {
    id: "archive",
    label: "选品库",
    group: "primary",
    render: () => createElement(ArchivePage),
  },
  {
    id: "schemes",
    label: "方案库",
    group: "primary",
    render: () => createElement(SchemesPage, { onEnterScheme: openSchemeDetailPage }),
  },
  {
    id: "comment-blue-link",
    label: "蓝链-置顶评论",
    group: "primary",
    render: () => createElement(CommentBlueLinkPage),
  },
  {
    id: "blue-link-map",
    label: "蓝链-商品映射",
    group: "primary",
    render: () => createElement(BlueLinkMapPage),
  },
  {
    id: "my-account",
    label: "我的账号",
    group: "primary",
    render: () => createElement(MyAccountPage),
  },
  {
    id: "commission",
    label: "获取商品佣金",
    group: "utility",
    render: () => createElement(CommissionPage),
  },
  {
    id: "direct-plans",
    label: "定向计划",
    group: "utility",
    render: () => createElement(DirectPlansPage),
  },
  {
    id: "recognize",
    label: "获取商品参数",
    group: "edge",
    render: () => createElement(RecognizePage),
  },
  {
    id: "benchmark",
    label: "对标视频收集",
    group: "utility",
    render: () => createElement(BenchmarkPage),
  },
  {
    id: "script",
    label: "提取视频文案",
    group: "edge",
    render: () => createElement(ScriptPage),
  },
  {
    id: "autocart",
    label: "一键抠图",
    group: "edge",
    render: () => createElement(AutoCartPage),
  },
  {
    id: "zhihu-radar",
    label: "知乎流量雷达",
    group: "edge",
    render: () => createElement(ZhihuRadarPage),
  },
]

export const PRIMARY_PAGES = PAGES.filter((page) => page.group === "primary")
export const UTILITY_PAGES = PAGES.filter((page) => page.group === "utility")
export const EDGE_PAGES = PAGES.filter((page) => page.group === "edge")

export function getPageById(pageId: string): PageConfig | undefined {
  return PAGES.find((page) => page.id === pageId)
}

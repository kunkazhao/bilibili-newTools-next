import { createElement, type ReactElement } from "react"
import ArchivePage from "@/pages/ArchivePage"
import AutoCartPage from "@/pages/AutoCartPage"
import BenchmarkPage from "@/pages/BenchmarkPage"
import BlueLinkMapPage from "@/pages/BlueLinkMapPage"
import CommentBlueLinkPage from "@/pages/CommentBlueLinkPage"
import CommissionPage from "@/pages/CommissionPage"
import MyAccountPage from "@/pages/MyAccountPage"
import RecognizePage from "@/pages/RecognizePage"
import SchemesPage from "@/pages/SchemesPage"
import ScriptPage from "@/pages/ScriptPage"
import ZhihuRadarPage from "@/pages/ZhihuRadarPage"
import { openSchemeDetailPage } from "@/utils/standaloneRoutes"

export type PageGroup = "primary" | "utility"

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
    id: "recognize",
    label: "获取商品参数",
    group: "utility",
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
    group: "utility",
    render: () => createElement(ScriptPage),
  },
  {
    id: "autocart",
    label: "一键抠图",
    group: "utility",
    render: () => createElement(AutoCartPage),
  },
  {
    id: "zhihu-radar",
    label: "知乎流量雷达",
    group: "utility",
    render: () => createElement(ZhihuRadarPage),
  },
]

export const PRIMARY_PAGES = PAGES.filter((page) => page.group === "primary")
export const UTILITY_PAGES = PAGES.filter((page) => page.group === "utility")

export function getPageById(pageId: string): PageConfig | undefined {
  return PAGES.find((page) => page.id === pageId)
}

import type { ReactNode } from "react"

const primaryItems = [
  "方案操作台",
  "选品库",
  "获取商品佣金",
  "获取商品参数",
  "对标视频收集",
]

const utilityItems = [
  "评论蓝链管理",
  "蓝链商品映射",
  "提取视频文案",
  "一键加购",
]

interface AppLayoutProps {
  children?: ReactNode
  activeIndex?: number
  onSelect?: (index: number) => void
}

export default function AppLayout({
  children,
  activeIndex = 0,
  onSelect,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="flex flex-col border-r border-slate-200 bg-slate-950 px-6 py-6 text-slate-100">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Creator Console
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-white">
              B站带货工具
            </h1>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400">主功能</p>
              <div className="space-y-2">
                {primaryItems.map((item, index) => (
                  <button
                    key={item}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      index === activeIndex
                        ? "bg-white/10 text-white"
                        : "text-slate-300 hover:bg-white/5 hover:text-white"
                    }`}
                    type="button"
                    onClick={() => onSelect?.(index)}
                  >
                    <span>{item}</span>
                    {index === activeIndex ? (
                      <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs text-brand">
                        当前
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-400">小工具</p>
              <div className="space-y-2">
                {utilityItems.map((item, index) => {
                  const targetIndex = primaryItems.length + index
                  const active = targetIndex === activeIndex
                  return (
                    <button
                      key={item}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                        active
                          ? "bg-white/10 text-white"
                          : "text-slate-300 hover:bg-white/5 hover:text-white"
                      }`}
                      type="button"
                      onClick={() => onSelect?.(targetIndex)}
                    >
                      <span>{item}</span>
                      {active ? (
                        <span className="rounded-full bg-brand/20 px-2 py-0.5 text-xs text-brand">
                          当前
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="mt-auto text-xs text-slate-500">v2026.01.24.1</div>
        </aside>

        <main className="flex min-h-screen flex-col">
          <div className="flex-1 p-8">{children}</div>
        </main>
      </div>
    </div>
  )
}

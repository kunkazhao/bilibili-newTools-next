import type { ReactNode } from "react"
import { PRIMARY_PAGES, UTILITY_PAGES } from "@/config/pages"

interface AppLayoutProps {
  children?: ReactNode
  activePageId?: string
  onSelect?: (pageId: string) => void
}

export default function AppLayout({
  children,
  activePageId = PRIMARY_PAGES[0]?.id,
  onSelect,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="flex flex-col border-r border-slate-200 bg-[#F0EFE6] px-6 py-6 text-slate-900">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
              Creator Console
            </p>
            <h1 className="mt-3 text-2xl font-semibold text-slate-900">
              B站带货工具
            </h1>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500">主功能</p>
              <div className="space-y-2">
                {PRIMARY_PAGES.map((page) => (
                  <button
                    key={page.id}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      page.id === activePageId
                        ? "bg-brand/10 text-brand"
                        : "text-slate-700 hover:bg-slate-900/5 hover:text-slate-900"
                    }`}
                    type="button"
                    onClick={() => onSelect?.(page.id)}
                  >
                    <span>{page.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-500">小工具</p>
              <div className="space-y-2">
                {UTILITY_PAGES.map((page) => (
                  <button
                    key={page.id}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition ${
                      page.id === activePageId
                        ? "bg-brand/10 text-brand"
                        : "text-slate-700 hover:bg-slate-900/5 hover:text-slate-900"
                    }`}
                    type="button"
                    onClick={() => onSelect?.(page.id)}
                  >
                    <span>{page.label}</span>
                  </button>
                ))}
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

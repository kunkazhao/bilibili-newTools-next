import { Button } from "@/components/ui/button"
import Empty from "@/components/Empty"
import Skeleton from "@/components/Skeleton"
import { Copy, Settings } from "lucide-react"
import {
  COVER_PLACEHOLDER,
  formatDate,
  formatDuration,
  formatNumber,
  normalizeCover,
} from "@/components/benchmark/benchmarkUtils"
import type { Account } from "@/types/account"
import type { AccountVideo } from "@/components/my-account/types"

const SidebarSkeleton = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, index) => (
      <div
        key={index}
        className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2"
      >
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-3 w-12" />
      </div>
    ))}
  </div>
)

const CardSkeletons = () => (
  <div className="space-y-4">
    {Array.from({ length: 6 }).map((_, index) => (
      <div
        key={index}
        className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4"
      >
        <Skeleton className="h-24 w-40 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
)

interface BenchmarkAccountPageViewProps {
  loading: boolean
  syncing: boolean
  accounts: Account[]
  currentAccountId: string | null
  videos: AccountVideo[]
  onAccountChange: (accountId: string) => void
  onOpenAccountManage: () => void
  onSyncCurrent: () => void
  onSyncAll: () => void
  onCopyVideo: (video: AccountVideo) => void
}

export default function BenchmarkAccountPageView({
  loading,
  syncing,
  accounts,
  currentAccountId,
  videos,
  onAccountChange,
  onOpenAccountManage,
  onSyncCurrent,
  onSyncAll,
  onCopyVideo,
}: BenchmarkAccountPageViewProps) {
  if (loading && accounts.length === 0) {
    return (
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card min-h-[calc(100vh-240px)]">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="mt-4">
            <SidebarSkeleton />
          </div>
        </aside>
        <section className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          <CardSkeletons />
        </section>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card min-h-[calc(100vh-240px)]">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{"\u5bf9\u6807\u8d26\u53f7"}</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500"
            onClick={onOpenAccountManage}
            aria-label={"\u8d26\u53f7\u7ba1\u7406"}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {accounts.map((account) => (
            <button
              key={account.id}
              className={`flex w-full items-start justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                currentAccountId === account.id
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
              type="button"
              onClick={() => onAccountChange(account.id)}
            >
              <div className="flex-1">
                <div className="font-medium text-slate-900">{account.name}</div>
              </div>
            </button>
          ))}
          {loading && accounts.length === 0 ? <SidebarSkeleton /> : null}
        </div>
      </aside>

      <section className="space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{"\u5bf9\u6807\u8d26\u53f7\u89c6\u9891"}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {
                  "\u5c55\u793a\u9009\u4e2d\u5bf9\u6807\u8d26\u53f7\u7684\u6700\u65b0\u89c6\u9891\u5185\u5bb9\uff0c\u652f\u6301\u4ec5\u66f4\u65b0\u5f53\u524d\u8d26\u53f7\uff0c\u6216\u4e00\u6b21\u66f4\u65b0\u5168\u90e8\u8d26\u53f7\uff08\u6bcf\u4e2a\u8d26\u53f7\u6700\u591a50\u6761\uff09\u3002"
                }
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={onSyncCurrent}
                disabled={!currentAccountId || syncing}
              >
                {"\u66f4\u65b0\u5f53\u524d\u8d26\u53f7\u89c6\u9891"}
              </Button>
              <Button onClick={onSyncAll} disabled={!accounts.length || syncing}>
                {syncing
                  ? "\u83b7\u53d6\u4e2d..."
                  : "\u83b7\u53d6\u5168\u90e8\u8d26\u53f7\u89c6\u9891"}
              </Button>
            </div>
          </div>
        </div>

        {videos.length === 0 && !loading ? (
          <Empty
            title={"\u6682\u65e0\u89c6\u9891"}
            description={
              "\u70b9\u51fb\u53f3\u4fa7\u6309\u94ae\u66f4\u65b0\u5f53\u524d\u8d26\u53f7\uff0c\u6216\u83b7\u53d6\u5168\u90e8\u5bf9\u6807\u8d26\u53f7\u89c6\u9891\u3002"
            }
          />
        ) : loading && videos.length === 0 ? (
          <CardSkeletons />
        ) : (
          <div className="space-y-4">
            {videos.map((video) => {
              const cover = normalizeCover(video.cover) || COVER_PLACEHOLDER
              const author = video.author || "\u672a\u77e5\u4f5c\u8005"
              const durationLabel = formatDuration(video.duration)
              return (
                <article
                  key={video.id}
                  className="flex flex-wrap gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  onClick={() => {
                    if (video.link) window.open(video.link, "_blank")
                  }}
                >
                  <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-xl bg-slate-900">
                    <img
                      src={cover}
                      alt={video.title || ""}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/80 to-transparent" />
                    {durationLabel ? (
                      <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded bg-black/75 px-1.5 py-0.5 text-[11px] font-semibold text-white shadow-sm">
                        {durationLabel}
                      </span>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-slate-900 line-clamp-2">
                      {video.title || "\u672a\u547d\u540d\u89c6\u9891"}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{author}</span>
                      <span className="opacity-40">{"\u00b7"}</span>
                      <span>{formatDate(video.pub_time || null)}</span>
                      {video.bvid ? (
                        <>
                          <span className="opacity-40">{"\u00b7"}</span>
                          <span>BV: {video.bvid}</span>
                        </>
                      ) : null}
                      <Button
                        variant="outline"
                        size="icon"
                        className="ml-1 h-6 w-6 text-slate-500"
                        aria-label="Copy video link"
                        onClick={(event) => {
                          event.stopPropagation()
                          onCopyVideo(video)
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">
                      <span>{"\u64ad\u653e"} {formatNumber(video.stats?.view)}</span>
                      <span>{"\u70b9\u8d5e"} {formatNumber(video.stats?.like)}</span>
                      <span>{"\u6536\u85cf"} {formatNumber(video.stats?.favorite)}</span>
                      <span>{"\u8bc4\u8bba"} {formatNumber(video.stats?.reply)}</span>
                      <span>{"\u5f39\u5e55"} {formatNumber(video.stats?.danmaku)}</span>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

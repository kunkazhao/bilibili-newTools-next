import { Button } from "@/components/ui/button"
import Empty from "@/components/Empty"
import Skeleton from "@/components/Skeleton"
import { Copy, Settings } from "lucide-react"
import {
  COVER_PLACEHOLDER,
  formatDate,
  formatNumber,
  normalizeCover,
} from "@/components/benchmark/benchmarkUtils"
import type { Account } from "@/types/account"
import type { AccountVideo } from "./types"

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

interface MyAccountPageViewProps {
  loading: boolean
  syncing: boolean
  accounts: Account[]
  currentAccountId: string | null
  videos: AccountVideo[]
  onAccountChange: (accountId: string) => void
  onOpenAccountManage: () => void
  onSync: () => void
  onCopyVideo: (video: AccountVideo) => void
}

export default function MyAccountPageView({
  loading,
  syncing,
  accounts,
  currentAccountId,
  videos,
  onAccountChange,
  onOpenAccountManage,
  onSync,
  onCopyVideo,
}: MyAccountPageViewProps) {
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
          <h3 className="text-base font-semibold text-slate-900">我的账号</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500"
            onClick={onOpenAccountManage}
            aria-label="账号管理"
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
              <h3 className="text-lg font-semibold text-slate-900">账号视频</h3>
              <p className="mt-1 text-sm text-slate-500">
                展示选中账号的最新视频内容，点击右上角同步全部账号。
              </p>
            </div>
            <Button onClick={onSync} disabled={!accounts.length || syncing}>
              {syncing ? "获取中..." : "获取最新视频"}
            </Button>
          </div>
        </div>

        {videos.length === 0 && !loading ? (
          <Empty title="暂无视频" description="点击右上角“获取最新视频”同步全部账号。" />
        ) : loading && videos.length === 0 ? (
          <CardSkeletons />
        ) : (
          <div className="space-y-4">
            {videos.map((video) => {
              const cover = normalizeCover(video.cover) || COVER_PLACEHOLDER
              const author = video.author || "未知作者"
              return (
                <article
                  key={video.id}
                  className="flex flex-wrap gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-card transition hover:border-slate-300"
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
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-slate-900 line-clamp-2">
                      {video.title || "未命名视频"}
                    </h4>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>{author}</span>
                      <span className="opacity-40">·</span>
                      <span>{formatDate(video.pub_time || null)}</span>
                      {video.bvid ? (
                        <>
                          <span className="opacity-40">·</span>
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
                      <span>播放 {formatNumber(video.stats?.view)}</span>
                      <span>点赞 {formatNumber(video.stats?.like)}</span>
                      <span>收藏 {formatNumber(video.stats?.favorite)}</span>
                      <span>评论 {formatNumber(video.stats?.reply)}</span>
                      <span>弹幕 {formatNumber(video.stats?.danmaku)}</span>
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

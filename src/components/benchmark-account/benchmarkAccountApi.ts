import { apiRequest } from "@/lib/api"
import type { Account } from "@/types/account"
import type { AccountVideo } from "@/components/my-account/types"

export const fetchBenchmarkAccountState = (accountId: string) =>
  apiRequest<{ accounts: Account[]; videos: AccountVideo[] }>(
    `/api/benchmark-accounts/state?account_id=${encodeURIComponent(accountId)}`
  )

export const syncBenchmarkAccountVideos = (accountId: string) =>
  apiRequest<{
    added: number
    updated: number
    video_count: number
    videos: AccountVideo[]
  }>(
    "/api/benchmark-accounts/sync",
    {
      method: "POST",
      body: JSON.stringify({ account_id: accountId }),
    }
  )

export const fetchBenchmarkAccountVideoCounts = () =>
  apiRequest<{
    total: number
    items: Array<{ account_id: string; name?: string | null; count: number }>
    failures: Array<{ account_id?: string; name?: string | null; reason: string }>
  }>("/api/benchmark-accounts/video-counts")

export const syncBenchmarkAccountVideosAll = () =>
  apiRequest<{
    total_accounts: number
    added: number
    updated: number
    failed: number
    results: Array<{
      account_id: string
      name?: string | null
      added: number
      updated: number
      error?: string
    }>
  }>("/api/benchmark-accounts/sync-all", { method: "POST" })

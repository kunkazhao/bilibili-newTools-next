import { apiRequest } from "@/lib/api"
import type { Account } from "@/types/account"
import type { AccountVideo } from "./types"

export const fetchMyAccountState = (accountId: string) =>
  apiRequest<{ accounts: Account[]; videos: AccountVideo[] }>(
    `/api/my-accounts/state?account_id=${encodeURIComponent(accountId)}`
  )

export const syncMyAccountVideos = (accountId: string) =>
  apiRequest<{
    added: number
    updated: number
    video_count: number
    videos: AccountVideo[]
  }>(
    "/api/my-accounts/sync",
    {
      method: "POST",
      body: JSON.stringify({ account_id: accountId }),
    }
  )

export const fetchMyAccountVideoCounts = () =>
  apiRequest<{
    total: number
    items: Array<{ account_id: string; name?: string | null; count: number }>
    failures: Array<{ account_id?: string; name?: string | null; reason: string }>
  }>("/api/my-accounts/video-counts")

export const syncMyAccountVideosAll = () =>
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
  }>("/api/my-accounts/sync-all", { method: "POST" })

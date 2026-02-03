import { apiRequest } from "@/lib/api"
import type { Account } from "@/types/account"
import type { AccountVideo } from "./types"

export const fetchMyAccountState = (accountId: string) =>
  apiRequest<{ accounts: Account[]; videos: AccountVideo[] }>(
    `/api/my-accounts/state?account_id=${encodeURIComponent(accountId)}`
  )

export const syncMyAccountVideos = (accountId: string) =>
  apiRequest<{ added: number; updated: number; videos: AccountVideo[] }>(
    "/api/my-accounts/sync",
    {
      method: "POST",
      body: JSON.stringify({ account_id: accountId }),
    }
  )

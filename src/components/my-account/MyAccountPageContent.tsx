import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { useToast } from "@/components/Toast"
import { apiRequest } from "@/lib/api"
import { useListDataPipeline } from "@/hooks/useListDataPipeline"
import ProgressDialog from "@/components/ProgressDialog"

import MyAccountDialogs from "./MyAccountDialogs"
import MyAccountPageView from "./MyAccountPageView"
import {
  fetchMyAccountState,
  fetchMyAccountVideoCounts,
  syncMyAccountVideos,
} from "./myAccountApi"

import type { Account } from "@/types/account"
import type { AccountVideo } from "./types"
import { getUserErrorMessage } from "@/lib/errorMessages"

type MyAccountState = {
  accounts: Account[]
  videos: AccountVideo[]
}

const EMPTY_STATE: MyAccountState = { accounts: [], videos: [] }

export default function MyAccountPageContent() {
  const { showToast } = useToast()
  const lastErrorRef = useRef<string | null>(null)

  const fetchState = useCallback(
    async ({ filters }: { filters: { accountId: string }; offset: number; limit: number }) =>
      fetchMyAccountState(filters.accountId),
    []
  )

  const mapResponse = useCallback((response: MyAccountState) => {
    const accounts = Array.isArray(response.accounts) ? response.accounts : []
    const videos = Array.isArray(response.videos) ? response.videos : []
    return {
      items: [{ accounts, videos }],
      pagination: { hasMore: false, nextOffset: 1 },
    }
  }, [])

  const {
    items: stateItems,
    status,
    error,
    filters,
    setFilters,
    setItems: setStateItems,
    refresh,
  } = useListDataPipeline<MyAccountState, { accountId: string }, MyAccountState>({
    cacheKey: "my-accounts",
    ttlMs: 3 * 60 * 1000,
    pageSize: 1,
    initialFilters: { accountId: "" },
    fetcher: fetchState,
    mapResponse,
  })

  const state = stateItems[0] ?? EMPTY_STATE
  const accounts = state.accounts
  const videos = state.videos

  const [currentAccountId, setCurrentAccountId] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [accountNameInput, setAccountNameInput] = useState("")
  const [accountLinkInput, setAccountLinkInput] = useState("")
  const [accountSubmitting, setAccountSubmitting] = useState(false)
  const [progressOpen, setProgressOpen] = useState(false)
  const [progressStatus, setProgressStatus] = useState<
    "running" | "done" | "cancelled" | "error"
  >("running")
  const [progressTotal, setProgressTotal] = useState(0)
  const [progressProcessed, setProgressProcessed] = useState(0)
  const [progressSuccess, setProgressSuccess] = useState(0)
  const [progressFailures, setProgressFailures] = useState<
    Array<{ name: string; reason?: string }>
  >([])
  const progressProcessedRef = useRef(0)
  const progressSuccessRef = useRef(0)

  const isLoading = status === "loading" || status === "warmup" || status === "refreshing"

  const updateState = useCallback(
    (updater: (prev: MyAccountState) => MyAccountState) => {
      setStateItems((prev) => {
        const current = prev[0] ?? EMPTY_STATE
        return [updater(current)]
      })
    },
    [setStateItems]
  )

  const accountMap = useMemo(() => {
    return new Map(accounts.map((account) => [account.id, account]))
  }, [accounts])

  useEffect(() => {
    if (status !== "error" || !error) return
    if (lastErrorRef.current === error) return
    lastErrorRef.current = error
    showToast(error, "error")
  }, [error, showToast, status])

  useEffect(() => {
    if (!accounts.length) {
      setCurrentAccountId(null)
      return
    }
    setCurrentAccountId((prev) => {
      if (prev && accounts.some((item) => item.id === prev)) {
        return prev
      }
      return accounts[0]?.id || null
    })
  }, [accounts])

  useEffect(() => {
    const nextAccountId = currentAccountId ?? ""
    if (filters.accountId === nextAccountId) return
    setFilters({ accountId: nextAccountId })
  }, [currentAccountId, filters.accountId, setFilters])

  useEffect(() => {
    updateState((prev) => {
      if (!currentAccountId) {
        return prev.videos.length ? { ...prev, videos: [] } : prev
      }
      return prev.videos.length ? { ...prev, videos: [] } : prev
    })
  }, [currentAccountId, updateState])

  const handleAccountOpenChange = (open: boolean) => {
    setAccountModalOpen(open)
    if (!open) {
      setAccountNameInput("")
      setAccountLinkInput("")
    }
  }

  const handleAccountSubmit = async () => {
    if (accountSubmitting) return
    const name = accountNameInput.trim()
    if (!name) {
      showToast("账号名称不能为空", "error")
      return
    }
    const homepageLink = accountLinkInput.trim() || null
    setAccountSubmitting(true)
    try {
      const data = await apiRequest<{ account: Account }>("/api/comment/accounts", {
        method: "POST",
        body: JSON.stringify({ name, homepage_link: homepageLink }),
      })
      const created = data.account
      updateState((prev) => ({
        ...prev,
        accounts: [...prev.accounts, created],
      }))
      setAccountNameInput("")
      setAccountLinkInput("")
      setCurrentAccountId(created.id)
      showToast("账号已新增", "success")
    } catch (error) {
      const message = getUserErrorMessage(error, "新增失败")
      showToast(message, "error")
    } finally {
      setAccountSubmitting(false)
    }
  }

  const handleAccountNameBlur = async (accountId: string, value: string) => {
    const account = accountMap.get(accountId)
    if (!account) return
    const name = value.trim()
    if (!name) {
      showToast("账号名称不能为空", "error")
      return
    }
    if (name === account.name) return
    try {
      const data = await apiRequest<{ account: Account }>(
        `/api/comment/accounts/${accountId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ name }),
        }
      )
      updateState((prev) => ({
        ...prev,
        accounts: prev.accounts.map((item) =>
          item.id === accountId ? data.account : item
        ),
      }))
      showToast("账号已更新", "success")
    } catch (error) {
      const message = getUserErrorMessage(error, "更新失败")
      showToast(message, "error")
      refresh().catch(() => {})
    }
  }

  const handleAccountLinkBlur = async (accountId: string, value: string) => {
    const account = accountMap.get(accountId)
    if (!account) return
    const homepageLink = value.trim() || null
    if ((account.homepage_link || null) === homepageLink) return
    try {
      const data = await apiRequest<{ account: Account }>(
        `/api/comment/accounts/${accountId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ homepage_link: homepageLink }),
        }
      )
      updateState((prev) => ({
        ...prev,
        accounts: prev.accounts.map((item) =>
          item.id === accountId ? data.account : item
        ),
      }))
      showToast("主页链接已更新", "success")
    } catch (error) {
      const message = getUserErrorMessage(error, "更新失败")
      showToast(message, "error")
      refresh().catch(() => {})
    }
  }

  const handleAccountDelete = async (accountId: string) => {
    try {
      await apiRequest(`/api/comment/accounts/${accountId}`, { method: "DELETE" })
      updateState((prev) => ({
        ...prev,
        accounts: prev.accounts.filter((item) => item.id !== accountId),
        videos: currentAccountId === accountId ? [] : prev.videos,
      }))
      if (currentAccountId === accountId) {
        const next = accounts.filter((item) => item.id !== accountId)[0]?.id || null
        setCurrentAccountId(next)
      }
      showToast("账号已删除", "success")
    } catch (error) {
      const message = getUserErrorMessage(error, "删除失败")
      showToast(message, "error")
    }
  }

  const handleSync = async () => {
    if (syncing) return
    if (!accounts.length) {
      showToast("暂无可同步的账号", "info")
      return
    }
    setSyncing(true)
    progressProcessedRef.current = 0
    progressSuccessRef.current = 0
    setProgressOpen(true)
    setProgressStatus("running")
    setProgressTotal(0)
    setProgressProcessed(0)
    setProgressSuccess(0)
    setProgressFailures([])

    const updateProgress = (processedDelta: number, successDelta: number) => {
      progressProcessedRef.current += processedDelta
      progressSuccessRef.current += successDelta
      setProgressProcessed(progressProcessedRef.current)
      setProgressSuccess(progressSuccessRef.current)
    }
    try {
      const countData = await fetchMyAccountVideoCounts()
      const countMap = new Map(
        countData.items.map((item) => [item.account_id, item.count])
      )
      const initialFailures = countData.failures.map((item) => ({
        name: item.name || item.account_id || "未知账号",
        reason: item.reason,
      }))
      if (initialFailures.length) {
        setProgressFailures(initialFailures)
      }
      setProgressTotal(countData.total)

      const targetAccounts = accounts.filter((account) =>
        countMap.has(account.id)
      )
      const queue = [...targetAccounts]
      const concurrency = Math.min(2, queue.length)

      const runSync = async (account: Account) => {
        const count = countMap.get(account.id) ?? 0
        try {
          await syncMyAccountVideos(account.id)
          updateProgress(count, count)
        } catch (error) {
          const message = getUserErrorMessage(error, "同步失败")
          setProgressFailures((prev) => [
            ...prev,
            { name: account.name, reason: message },
          ])
          updateProgress(count, 0)
        }
      }

      const workers = Array.from({ length: concurrency }, async () => {
        while (queue.length) {
          const account = queue.shift()
          if (!account) return
          await runSync(account)
        }
      })

      await Promise.all(workers)
      await refresh()
      setProgressStatus("done")
    } catch (error) {
      const message = getUserErrorMessage(error, "同步失败")
      showToast(message, "error")
      setProgressStatus("error")
    } finally {
      setSyncing(false)
    }
  }

  const handleCopyVideo = async (video: AccountVideo) => {
    const link = video.link || ""
    if (!link) {
      showToast("视频链接为空", "error")
      return
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else {
        const textarea = document.createElement("textarea")
        textarea.value = link
        textarea.style.position = "fixed"
        textarea.style.left = "-9999px"
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand("copy")
        document.body.removeChild(textarea)
      }
      showToast("已复制视频链接", "success")
    } catch {
      showToast("复制失败，请手动复制", "error")
    }
  }

  return (
    <>
      <MyAccountPageView
        loading={isLoading}
        syncing={syncing}
        accounts={accounts}
        currentAccountId={currentAccountId}
        videos={videos}
        onAccountChange={setCurrentAccountId}
        onOpenAccountManage={() => setAccountModalOpen(true)}
        onSync={handleSync}
        onCopyVideo={handleCopyVideo}
      />
      <MyAccountDialogs
        accountModalOpen={accountModalOpen}
        accountNameInput={accountNameInput}
        accountLinkInput={accountLinkInput}
        accounts={accounts}
        onAccountNameChange={setAccountNameInput}
        onAccountLinkChange={setAccountLinkInput}
        onAccountSubmit={handleAccountSubmit}
        onAccountOpenChange={handleAccountOpenChange}
        onAccountNameBlur={handleAccountNameBlur}
        onAccountLinkBlur={handleAccountLinkBlur}
        onAccountDelete={handleAccountDelete}
      />
      <ProgressDialog
        open={progressOpen}
        title="同步视频进度"
        status={progressStatus}
        total={progressTotal}
        processed={progressProcessed}
        success={progressSuccess}
        failures={progressFailures}
        showFailures={progressFailures.length > 0}
        summaryText={`${progressTotal}个视频 · ${progressFailures.length}个失败`}
        onOpenChange={setProgressOpen}
      />
    </>
  )
}

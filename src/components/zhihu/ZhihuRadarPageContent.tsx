import { useCallback, useEffect, useMemo, useState } from "react"
import { useToast } from "@/components/Toast"
import type { CategoryItem } from "@/components/archive/types"
import ZhihuRadarPageView from "./ZhihuRadarPageView"
import {
  createZhihuKeyword,
  deleteZhihuKeyword,
  fetchZhihuKeywords,
  fetchZhihuQuestionStats,
  fetchZhihuQuestions,
  updateZhihuKeyword,
  type ZhihuKeyword,
  type ZhihuQuestionItem,
} from "./zhihuApi"

const buildCategoryItems = (
  keywords: ZhihuKeyword[],
  counts: Map<string, number>
): CategoryItem[] =>
  keywords.map((keyword, index) => ({
    id: keyword.id,
    name: keyword.name,
    sortOrder: (index + 1) * 10,
    count: counts.get(keyword.id) ?? 0,
  }))

export default function ZhihuRadarPageContent() {
  const { showToast } = useToast()
  const [keywords, setKeywords] = useState<ZhihuKeyword[]>([])
  const [isKeywordLoading, setIsKeywordLoading] = useState(false)
  const [items, setItems] = useState<ZhihuQuestionItem[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [activeKeywordId, setActiveKeywordId] = useState("all")
  const [searchValue, setSearchValue] = useState("")
  const [keywordManagerOpen, setKeywordManagerOpen] = useState(false)
  const [trendState, setTrendState] = useState({
    open: false,
    title: "",
    stats: [],
    loading: false,
  })

  const loadKeywords = useCallback(async () => {
    setIsKeywordLoading(true)
    try {
      const data = await fetchZhihuKeywords()
      const list = Array.isArray(data?.keywords) ? data.keywords : []
      setKeywords(list)
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载关键词失败"
      showToast(message, "error")
    } finally {
      setIsKeywordLoading(false)
    }
  }, [showToast])

  const loadQuestions = useCallback(async () => {
    setListLoading(true)
    try {
      const keywordId = activeKeywordId !== "all" ? activeKeywordId : undefined
      const query = searchValue.trim()
      const data = await fetchZhihuQuestions({
        keywordId,
        q: query ? query : undefined,
        limit: 50,
      })
      setItems(Array.isArray(data?.items) ? data.items : [])
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载问题列表失败"
      showToast(message, "error")
    } finally {
      setListLoading(false)
    }
  }, [activeKeywordId, searchValue, showToast])

  useEffect(() => {
    loadKeywords()
  }, [loadKeywords])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  useEffect(() => {
    if (activeKeywordId === "all") return
    if (!keywords.some((keyword) => keyword.id === activeKeywordId)) {
      setActiveKeywordId("all")
    }
  }, [activeKeywordId, keywords])

  const keywordCounts = useMemo(() => {
    const map = new Map<string, number>()
    const keywordIdByName = new Map(keywords.map((keyword) => [keyword.name, keyword.id]))
    items.forEach((item) => {
      const name = item.first_keyword || ""
      const id = keywordIdByName.get(name)
      if (!id) return
      map.set(id, (map.get(id) ?? 0) + 1)
    })
    return map
  }, [items, keywords])

  const categoryItems = useMemo(
    () => buildCategoryItems(keywords, keywordCounts),
    [keywords, keywordCounts]
  )

  const handleSaveKeywords = useCallback(
    async (nextCategories: CategoryItem[]) => {
      const existingMap = new Map(keywords.map((item) => [item.id, item]))
      const nextMap = new Map(nextCategories.map((item) => [item.id, item]))
      const toCreate = nextCategories.filter((item) => !existingMap.has(item.id))
      const toUpdate = nextCategories.filter((item) => {
        const current = existingMap.get(item.id)
        return current && current.name !== item.name
      })
      const toDelete = keywords.filter((item) => !nextMap.has(item.id))

      try {
        for (const item of toCreate) {
          await createZhihuKeyword(item.name.trim())
        }
        for (const item of toUpdate) {
          await updateZhihuKeyword(item.id, item.name.trim())
        }
        for (const item of toDelete) {
          await deleteZhihuKeyword(item.id)
        }
        await loadKeywords()
        if (activeKeywordId !== "all" && !nextMap.has(activeKeywordId)) {
          setActiveKeywordId("all")
        }
        showToast("关键词已更新", "success")
      } catch (error) {
        const message = error instanceof Error ? error.message : "更新关键词失败"
        showToast(message, "error")
      }
    },
    [activeKeywordId, keywords, loadKeywords, showToast]
  )

  const handleOpenTrend = useCallback(
    async (item: ZhihuQuestionItem) => {
      const title = item.title || "趋势分析"
      setTrendState({ open: true, title, stats: [], loading: true })
      try {
        const data = await fetchZhihuQuestionStats(item.id)
        setTrendState((prev) => ({
          ...prev,
          stats: Array.isArray(data?.stats) ? data.stats : [],
          loading: false,
        }))
      } catch (error) {
        const message = error instanceof Error ? error.message : "加载趋势失败"
        showToast(message, "error")
        setTrendState((prev) => ({ ...prev, loading: false }))
      }
    },
    [showToast]
  )

  return (
    <ZhihuRadarPageView
      keywords={categoryItems}
      activeKeywordId={activeKeywordId}
      items={items}
      isKeywordLoading={isKeywordLoading}
      listLoading={listLoading}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      onSelectKeyword={setActiveKeywordId}
      onOpenKeywordManager={() => setKeywordManagerOpen(true)}
      isKeywordManagerOpen={keywordManagerOpen}
      onCloseKeywordManager={() => setKeywordManagerOpen(false)}
      onSaveKeywords={handleSaveKeywords}
      onOpenTrend={handleOpenTrend}
      trendDialog={{
        ...trendState,
        onOpenChange: (open) =>
          setTrendState((prev) => ({
            ...prev,
            open,
            loading: open ? prev.loading : false,
            stats: open ? prev.stats : [],
            title: open ? prev.title : "",
          })),
      }}
    />
  )
}

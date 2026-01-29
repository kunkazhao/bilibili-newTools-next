import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import CommissionPageView from "@/components/commission/CommissionPageView"
import { useToast } from "@/components/Toast"

interface CommissionItem {
  id: string
  title: string
  price: number
  commissionRate: number
  image: string
  shopName: string
  source: string
  sales30: number
  comments: string
  isFocused: boolean
  spec: Record<string, string>
}

const META_KEYS = {
  sales30: "_s_30",
  comments: "_comments",
  shopName: "_shop_name",
  sourceLink: "_source_link",
  sourceAuthor: "_source_author",
  featured: "_featured",
}

const TEMP_STORAGE_KEY = "commission_temp_items_v1"

const demoVideos = [
  {
    id: "v1",
    title: "2026 无线降噪耳机测评｜开箱/体验/参数/音质/HIFI推荐",
    source: "B站",
    tag: "数码",
  },
  {
    id: "v2",
    title: "2026 游戏耳机横评｜耳机/麦克风/听声辨位/HIFI",
    source: "B站",
    tag: "游戏",
  },
  {
    id: "v3",
    title: "26 款键盘横评合集｜红轴/茶轴/青轴/静音轴推荐",
    source: "B站",
    tag: "外设",
  },
]

const getLocalItems = () => {
  try {
    const raw = localStorage.getItem(TEMP_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as CommissionItem[]
  } catch {
    return []
  }
}

const saveLocalItems = (next: CommissionItem[]) => {
  try {
    localStorage.setItem(TEMP_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? ""

const isBiliLink = (link: string) => /bilibili\.com|b23\.tv/i.test(link)

const getSourceDisplay = (spec: Record<string, string>) => {
  const link = spec[META_KEYS.sourceLink] || ""
  const author =
    spec[META_KEYS.sourceAuthor] ||
    spec["_bili_author"] ||
    spec["_author"] ||
    spec["_up_name"] ||
    spec["author"] ||
    ""
  if (!link) return "手动添加"
  if (isBiliLink(link)) {
    return author ? author : "未知作者"
  }
  return link
}

const fetchBiliAuthor = async (link: string) => {
  if (!API_BASE) return ""
  const response = await fetch(`${API_BASE}/api/bilibili/video-info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: link }),
  })
  if (!response.ok) return ""
  const data = await response.json()
  const owner = data?.owner || data?.data?.owner || data?.info?.owner
  const author = owner?.name || owner?.uname || data?.author || ""
  return author ? String(author).trim() : ""
}

export default function CommissionPage() {
  const { showToast } = useToast()
  const [items, setItems] = useState<CommissionItem[]>([])
  const [inputValue, setInputValue] = useState("")
  const [filters, setFilters] = useState({
    keyword: "",
    priceMin: "",
    priceMax: "",
    rateMin: "",
    rateMax: "",
    salesMin: "",
    salesMax: "",
    sort: "price_asc",
  })
  const [processingOpen, setProcessingOpen] = useState(false)
  const [resultOpen, setResultOpen] = useState(false)
  const [selectVideoOpen, setSelectVideoOpen] = useState(false)
  const [selectedVideos, setSelectedVideos] = useState<string[]>([])
  const [editTargetId, setEditTargetId] = useState<string | null>(null)
  const authorRequestedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const localItems = getLocalItems()
    setItems(localItems)
  }, [])

  useEffect(() => {
    if (!items.length) return
    const pending = items.filter((item) => {
      const link = item.spec[META_KEYS.sourceLink] || ""
      const author = item.spec[META_KEYS.sourceAuthor] || ""
      return link && isBiliLink(link) && !author && !authorRequestedRef.current.has(item.id)
    })
    if (!pending.length) return

    pending.forEach(async (item) => {
      authorRequestedRef.current.add(item.id)
      const link = item.spec[META_KEYS.sourceLink] || ""
      const author = await fetchBiliAuthor(link)
      if (!author) return
      setItems((prev) => {
        const next = prev.map((entry) => {
          if (entry.id !== item.id) return entry
          const spec = { ...entry.spec, [META_KEYS.sourceAuthor]: author }
          return { ...entry, spec }
        })
        saveLocalItems(next)
        return next
      })
    })
  }, [items])

  const filteredItems = useMemo(() => {
    const keyword = filters.keyword.trim()
    const priceMin = Number(filters.priceMin || 0)
    const priceMax = Number(filters.priceMax || Number.MAX_SAFE_INTEGER)
    const rateMin = Number(filters.rateMin || 0)
    const rateMax = Number(filters.rateMax || Number.MAX_SAFE_INTEGER)
    const salesMin = Number(filters.salesMin || 0)
    const salesMax = Number(filters.salesMax || Number.MAX_SAFE_INTEGER)

    const list = items.filter((item) => {
      const matchesKeyword = !keyword || item.title.includes(keyword)
      const matchesPrice = item.price >= priceMin && item.price <= priceMax
      const matchesRate =
        item.commissionRate >= rateMin && item.commissionRate <= rateMax
      const matchesSales = item.sales30 >= salesMin && item.sales30 <= salesMax
      return matchesKeyword && matchesPrice && matchesRate && matchesSales
    })

    return list.sort((a, b) => {
      if (filters.sort === "price_desc") return b.price - a.price
      return a.price - b.price
    })
  }, [items, filters])

  const itemsView = filteredItems.map((item, index) => {
    const commission = (item.price * item.commissionRate) / 100
    return {
      id: item.id,
      index: index + 1,
      title: item.title,
      price: item.price,
      commissionRate: item.commissionRate,
      commission,
      sales30: item.sales30,
      comments: item.comments,
      image: item.image,
      shopName: item.shopName,
      source: getSourceDisplay(item.spec),
      isFocused: item.isFocused,
    }
  })

  const editTarget = items.find((item) => item.id === editTargetId)

  const updateLocalItems = useCallback((updater: (prev: CommissionItem[]) => CommissionItem[]) => {
    setItems((prev) => {
      const next = updater(prev)
      saveLocalItems(next)
      return next
    })
  }, [])

  return (
    <CommissionPageView
      inputValue={inputValue}
      onInputChange={setInputValue}
      items={itemsView}
      isProcessing={processingOpen}
      progress={{ current: 0, total: 1 }}
      resultOpen={resultOpen}
      resultItems={[
        { label: "总商品", value: "41 条" },
        { label: "成功", value: "37 条" },
        { label: "失败", value: "4 条" },
        { label: "跳过", value: "0 条" },
        { label: "无效", value: "0 条" },
      ]}
      resultHighlight={{ label: "成功", value: "37 条" }}
      selectVideoOpen={selectVideoOpen}
      videoItems={demoVideos}
      selectedVideos={selectedVideos}
      editTarget={
        editTarget
          ? {
              id: editTarget.id,
              title: editTarget.title,
              price: editTarget.price,
              commissionRate: editTarget.commissionRate,
            }
          : undefined
      }
      filters={filters}
      onFilterChange={(key, value) =>
        setFilters((prev) => ({ ...prev, [key]: value }))
      }
      onToggleFocus={(id) =>
        updateLocalItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, isFocused: !item.isFocused } : item
          )
        )
      }
      onEdit={(id) => setEditTargetId(id)}
      onArchive={() => showToast("归档功能待实现", "info")}
      onDelete={(id) => {
        updateLocalItems((prev) => prev.filter((item) => item.id !== id))
        showToast("删除成功", "success")
      }}
      onParseBili={() => {
        if (!inputValue.trim()) {
          showToast("请输入链接", "info")
          return
        }
        setProcessingOpen(true)
      }}
      onParsePromo={() => {
        if (!inputValue.trim()) {
          showToast("请输入链接", "info")
          return
        }
        setProcessingOpen(true)
      }}
      onParseBenchmark={() => setSelectVideoOpen(true)}
      onCloseProgress={() => setProcessingOpen(false)}
      onCloseResult={() => setResultOpen(false)}
      onSortAll={() => {
        setResultOpen(false)
        showToast("已将全部商品置顶", "success")
      }}
      onSortNew={() => {
        setResultOpen(false)
        showToast("已将新增商品置顶", "success")
      }}
      onToggleVideo={(id) =>
        setSelectedVideos((prev) =>
          prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        )
      }
      onStartExtract={() => {
        setSelectVideoOpen(false)
        setProcessingOpen(true)
      }}
      onCloseSelectVideo={() => setSelectVideoOpen(false)}
      onSaveEdit={(payload) => {
        if (!editTarget) return
        updateLocalItems((prev) =>
          prev.map((item) =>
            item.id === editTarget.id
              ? {
                  ...item,
                  title: payload.title,
                  price: payload.price,
                  commissionRate: payload.commissionRate,
                }
              : item
          )
        )
        showToast("保存成功", "success")
      }}
      onCloseEdit={() => setEditTargetId(null)}
    />
  )
}

import { useCallback, useEffect, useRef, useState } from "react"
import type { ChangeEvent, DragEvent } from "react"
import { useToast } from "@/components/Toast"
import * as XLSX from "xlsx"
import RecognizeDialogs from "./RecognizeDialogs"
import RecognizePageView from "./RecognizePageView"
import type { PreviewImage, RecognizeEntry } from "./types"
import { getUserErrorMessage } from "@/lib/errorMessages"

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? ""

const ENTRY_STORAGE_KEY = "image_params_entries"
const COLUMN_ORDER_KEY = "image_params_column_order"
const COLUMN_LOCK_KEY = "image_params_column_lock"

const getLocalEntries = () => {
  try {
    const rawEntries = localStorage.getItem(ENTRY_STORAGE_KEY)
    if (!rawEntries) return []
    const parsed = JSON.parse(rawEntries)
    if (!Array.isArray(parsed)) return []
    return parsed as RecognizeEntry[]
  } catch {
    return []
  }
}

const saveLocalEntries = (next: RecognizeEntry[]) => {
  try {
    localStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

const COLUMN_ALIAS_GROUPS = [
  {
    target: "续航",
    keywords: [
      "续航",
      "耳机续航",
      "续航时间",
      "电池续航",
      "使用时长",
      "续航能力",
      "待机时间",
      "续航表现",
    ],
  },
  {
    target: "重量",
    keywords: ["重量", "机身重量", "耳机重量", "整机重量", "整体重量"],
  },
]

const PRICE_KEYWORDS = [
  "价格",
  "售价",
  "销售价",
  "到手价",
  "参考价",
  "参考价格",
  "入手价",
  "优惠价",
  "活动价",
  "官方价",
  "现价",
  "报价",
  "标价",
  "定价",
  "price",
  "cost",
  "rmb",
  "cny",
  "usd",
  "hkd",
]

const normalizeColumnKey = (name: string) => {
  const trimmed = String(name || "").trim()
  if (!trimmed) return ""
  const lower = trimmed.toLowerCase()
  for (const group of COLUMN_ALIAS_GROUPS) {
    const matched = group.keywords.some((keyword) => {
      const kwLower = keyword.toLowerCase()
      return lower === kwLower || lower.includes(kwLower) || kwLower.includes(lower)
    })
    if (matched) return group.target
  }
  return trimmed
}

const isPriceColumnKey = (key: string) => {
  const normalized = normalizeColumnKey(key).toLowerCase()
  return PRICE_KEYWORDS.some((label) => normalized.includes(label.toLowerCase()))
}

const normalizePrice = (value: string) => {
  if (!value) return ""
  const textValue = String(value).replace(/,/g, "").trim()
  if (!textValue) return ""
  if (/(?:g|kg|千克|克)(?:$|\b)/i.test(textValue)) return ""
  const match = textValue.match(/\d+(?:\.\d+)?/)
  if (!match) return ""
  const num = parseFloat(match[0])
  if (Number.isNaN(num)) return ""
  let formatted = Number.isInteger(num)
    ? `${num}`
    : num.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")
  if (!formatted) {
    formatted = match[0]
  }
  return formatted
}

const formatProductName = (name: string) => {
  if (!name) return ""
  let value = String(name).trim()
  value = value.replace(/\.(jpe?g|png|webp|gif)$/i, "")
  const suffixPatterns = [
    /\s*参数(图片|图)\s*\d*$/i,
    /\s*参数信息\s*\d*$/i,
    /\s*参数表\s*\d*$/i,
    /\s*(主图|详情图|商品图|产品图|示意图)\s*\d*$/i,
  ]
  suffixPatterns.forEach((pattern) => {
    value = value.replace(pattern, "")
  })
  value = value.replace(/[-_()（）]*参数(图片|图)?$/i, "")
  value = value.replace(/\s{2,}/g, " ")
  return value.trim()
}

const extractPrice = (raw: Record<string, unknown>, params: Record<string, string>) => {
  const candidates: { value: string; weight: number }[] = []

  const addCandidate = (
    value: unknown,
    options: { weight?: number; isPriceLabel?: boolean } = {}
  ) => {
    const { weight = 1, isPriceLabel = false } = options
    if (value === null || value === undefined) return
    const str = String(value).trim()
    if (!str || !/\d/.test(str)) return
    const looksLikeWeight = /(?:g|kg|千克|克)(?:$|\b)/i.test(str)
    if (!isPriceLabel && looksLikeWeight) return
    const hasCurrency = /(?:￥|￥|元|人民币|rmb|cny|usd|美元|hkd|港币)/i.test(str)
    if (!isPriceLabel && !hasCurrency) return
    candidates.push({ value: str, weight })
  }

  const pushFromObject = (obj: Record<string, unknown> | undefined) => {
    if (!obj) return
    Object.entries(obj).forEach(([key, value]) => {
      const normalizedKey = normalizeColumnKey(key)
      const isPriceLabel =
        isPriceColumnKey(normalizedKey) ||
        /(price|cost|售价|到手|参考|官方|优惠|活动|标价|定价|价格)/i.test(String(key))
      if (isPriceLabel) {
        addCandidate(value, { weight: 5, isPriceLabel: true })
      }
    })
  }

  pushFromObject(raw)
  pushFromObject(params)

  if (Array.isArray(raw.additional_notes)) {
    raw.additional_notes.forEach((note) => addCandidate(note, { weight: 1 }))
  }
  if (typeof raw.raw_text === "string") {
    addCandidate(raw.raw_text, { weight: 1 })
  }

  candidates.sort((a, b) => b.weight - a.weight)
  for (const candidate of candidates) {
    const normalized = normalizePrice(candidate.value)
    if (normalized) return normalized
  }
  return ""
}

const normalizeEntryParams = (entry: RecognizeEntry) => {
  const params: Record<string, string> = {}
  Object.entries(entry.params || {}).forEach(([key, value]) => {
    const normalizedKey = normalizeColumnKey(key)
    if (!normalizedKey) return
    const stringValue =
      value === null || value === undefined
        ? ""
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value)
    if (!(normalizedKey in params) || (params[normalizedKey] === "" && stringValue)) {
      params[normalizedKey] = stringValue
    }
  })
  entry.params = params
}

const removePriceColumns = (params: Record<string, string>) => {
  Object.keys(params).forEach((key) => {
    if (isPriceColumnKey(key)) {
      delete params[key]
    }
  })
}

const parseParamsResponse = (
  raw: Record<string, unknown>
): { name: string; price: string; params: Record<string, string> } => {
  if (!raw || typeof raw !== "object") {
    return { name: "", price: "", params: {} }
  }

  let name =
    (raw["产品名称"] as string) ||
    (raw["商品名称"] as string) ||
    (raw["商品名"] as string) ||
    (raw["name"] as string) ||
    (raw["title"] as string) ||
    (raw["product_name"] as string) ||
    ""

  const params: Record<string, string> = {}

  const legacyList = raw["参数"]
  if (Array.isArray(legacyList)) {
    legacyList.forEach((item) => {
      Object.entries(item || {}).forEach(([key, value]) => {
        params[key] = value as string
      })
    })
  }

  const structuredList = raw["parameters"]
  if (Array.isArray(structuredList)) {
    structuredList.forEach((item) => {
      if (!item) return
      if ((item as { name?: string }).name && (item as { value?: unknown }).value !== undefined) {
        params[(item as { name: string }).name] = (item as { value: string }).value as string
      } else {
        Object.entries(item as Record<string, unknown>).forEach(([key, value]) => {
          params[key] = value as string
        })
      }
    })
  }

  Object.entries(raw).forEach(([key, value]) => {
    if (
      [
        "产品名称",
        "商品名称",
        "商品名",
        "name",
        "title",
        "参数",
        "raw_text",
        "product_name",
        "parameters",
        "additional_notes",
        "price",
      ].includes(key)
    )
      return
    params[key] = value as string
  })

  let summary = ""
  if (Array.isArray(raw.additional_notes) && raw.additional_notes.length > 0) {
    summary = raw.additional_notes.join("\n")
  }

  if (!name && params["产品名称"]) {
    name = params["产品名称"]
    delete params["产品名称"]
  }

  if (!name && raw.raw_text) {
    params["识别文本"] = String(raw.raw_text)
  }

  Object.keys(params).forEach((key) => {
    if (params[key] === null || params[key] === undefined) {
      params[key] = ""
    } else if (typeof params[key] === "object") {
      params[key] = JSON.stringify(params[key])
    } else {
      params[key] = String(params[key])
    }
  })

  const summaryAliasKeys = ["总结", "摘要", "概述"]
  const summaryKey = summaryAliasKeys.find((key) => params[key])
  if (!summary && summaryKey) {
    summary = params[summaryKey]
  }

  const price = extractPrice(raw, params)
  removePriceColumns(params)

  summary = summary ? summary.trim() : ""
  if (!summary && params["总结"]) {
    summary = String(params["总结"]).trim()
  }
  if (summary && !params["总结"]) {
    params["总结"] = summary
  }
  summaryAliasKeys.forEach((key) => {
    if (key !== "总结") delete params[key]
  })

  return { name: formatProductName(name || ""), price: normalizePrice(price), params }
}

const getTimestamp = () => {
  const now = new Date()
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(
    now.getMinutes()
  ).padStart(2, "0")}`
}

export default function RecognizePageContent() {
  const { showToast } = useToast()
  const [entries, setEntries] = useState<RecognizeEntry[]>([])
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [isColumnLocked, setIsColumnLocked] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [progressOpen, setProgressOpen] = useState(false)
  const [progressStatus, setProgressStatus] = useState<
    "running" | "done" | "cancelled" | "error"
  >("done")
  const [progressTotal, setProgressTotal] = useState(0)
  const [progressProcessed, setProgressProcessed] = useState(0)
  const [progressSuccess, setProgressSuccess] = useState(0)
  const [progressFailures, setProgressFailures] = useState<
    Array<{ name: string; reason?: string; link?: string }>
  >([])

  const [addColumnOpen, setAddColumnOpen] = useState(false)
  const [addColumnValue, setAddColumnValue] = useState("")
  const [editColumnOpen, setEditColumnOpen] = useState(false)
  const [editColumnValue, setEditColumnValue] = useState("")
  const [editColumnOriginal, setEditColumnOriginal] = useState<string | null>(null)

  const [deleteColumn, setDeleteColumn] = useState<string | null>(null)
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const columnOrderRef = useRef<string[]>([])
  const progressCancelRef = useRef(false)

  useEffect(() => {
    columnOrderRef.current = columnOrder
  }, [columnOrder])

  const updateLocalEntries = useCallback(
    (updater: (prev: RecognizeEntry[]) => RecognizeEntry[]) => {
      setEntries((prev) => {
        const next = updater(prev)
        saveLocalEntries(next)
        return next
      })
    },
    []
  )

  useEffect(() => {
    try {
      const list = getLocalEntries()
      if (list.length) {
        const normalized = list.map((item: RecognizeEntry) => {
          const entry = {
            ...item,
            params: item.params || {},
            price: item.price ? normalizePrice(item.price) : "",
          }
          normalizeEntryParams(entry)
          removePriceColumns(entry.params)
          return entry
        })
        setEntries(normalized)
      }
    } catch {
      // ignore
    }

    try {
      const rawOrder = localStorage.getItem(COLUMN_ORDER_KEY)
      if (rawOrder) {
        const list = JSON.parse(rawOrder)
        if (Array.isArray(list)) {
          const next = list.map((col) => normalizeColumnKey(col)).filter(Boolean)
          setColumnOrder(next)
        }
      }
    } catch {
      // ignore
    }

    try {
      const locked = localStorage.getItem(COLUMN_LOCK_KEY)
      setIsColumnLocked(locked === "true")
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const unique = new Set<string>()
    entries.forEach((entry) => {
      Object.keys(entry.params || {}).forEach((key) => unique.add(normalizeColumnKey(key)))
    })
    let uniqueColumns = Array.from(unique).filter(Boolean)
    uniqueColumns = uniqueColumns.filter((col) => !isPriceColumnKey(col))

    if (isColumnLocked && columnOrderRef.current.length > 0) {
      return
    }

    const existingOrder = columnOrderRef.current.filter((col) => uniqueColumns.includes(col))
    const newColumns = uniqueColumns.filter((col) => !existingOrder.includes(col))
    const nextOrder = [...existingOrder, ...newColumns]
    setColumnOrder(nextOrder)
    try {
      localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(nextOrder))
    } catch {
      // ignore
    }
  }, [entries, isColumnLocked])

  const openFilePicker = () => {
    inputRef.current?.click()
  }

  const handleFiles = async (files: File[]) => {
    if (!files.length) return
    progressCancelRef.current = false
    setProgressOpen(true)
    setProgressStatus("running")
    setProgressTotal(files.length)
    setProgressProcessed(0)
    setProgressSuccess(0)
    setProgressFailures([])
    setIsProcessing(true)
    try {
      for (let i = 0; i < files.length; i += 1) {
        if (progressCancelRef.current) break
        const file = files[i]
        if (!file.type.startsWith("image/")) {
          showToast(`文件 ${file.name} 不是图片，已跳过`, "error")
          setProgressFailures((prev) => [
            ...prev,
            { name: file.name, reason: "文件类型不是图片" },
          ])
          setProgressProcessed((prev) => prev + 1)
          continue
        }

        const preview = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result || ""))
          reader.onerror = () => reject(new Error("读取文件失败"))
          reader.readAsDataURL(file)
        })

        try {
          const formData = new FormData()
          formData.append("file", file)
          const response = await fetch(`${API_BASE}/api/image/recognize`, {
            method: "POST",
            body: formData,
          })
          if (!response.ok) {
            let detail = "识别失败"
            try {
              const error = await response.json()
              detail = error.detail || detail
            } catch {
              // ignore
            }
            throw new Error(detail)
          }
          const data = await response.json()
          const parsed = parseParamsResponse((data?.params || {}) as Record<string, unknown>)
          const entry: RecognizeEntry = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            name: parsed.name,
            price: parsed.price,
            image: preview,
            filename: file.name,
            createdAt: Date.now(),
            params: parsed.params,
          }
          normalizeEntryParams(entry)
          removePriceColumns(entry.params)
          updateLocalEntries((prev) => [...prev, entry])
          setProgressSuccess((prev) => prev + 1)
          setProgressProcessed((prev) => prev + 1)
        } catch (error) {
          const message = getUserErrorMessage(error, "识别失败")
          showToast(`识别失败: ${message}`, "error")
          setProgressFailures((prev) => [
            ...prev,
            { name: file.name, reason: message },
          ])
          setProgressProcessed((prev) => prev + 1)
        }
      }
    } finally {
      setIsProcessing(false)
      setProgressStatus(progressCancelRef.current ? "cancelled" : "done")
    }
  }

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length) {
      void handleFiles(files)
    }
    event.target.value = ""
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const files = Array.from(event.dataTransfer.files || [])
    if (files.length) {
      void handleFiles(files)
    }
  }

  const handleAddColumn = () => {
    const raw = addColumnValue.trim()
    if (!raw) {
      showToast("请输入列名", "error")
      return
    }
    const column = normalizeColumnKey(raw)
    if (!column) {
      showToast("列名无效，请重新输入", "error")
      return
    }
    if (columnOrderRef.current.includes(column)) {
      showToast("该列已存在", "error")
      return
    }
    const next = [...columnOrderRef.current, column]
    setColumnOrder(next)
    updateLocalEntries((prev) =>
      prev.map((entry) => ({
        ...entry,
        params: { ...entry.params, [column]: entry.params[column] ?? "" },
      }))
    )
    setAddColumnValue("")
    setAddColumnOpen(false)
    try {
      localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  const handleEditColumn = () => {
    if (!editColumnOriginal) return
    const raw = editColumnValue.trim()
    if (!raw) {
      showToast("请输入列名", "error")
      return
    }
    const column = normalizeColumnKey(raw)
    if (!column) {
      showToast("列名无效，请重新输入", "error")
      return
    }
    if (column !== editColumnOriginal && columnOrderRef.current.includes(column)) {
      showToast("该列已存在", "error")
      return
    }
    const next = columnOrderRef.current.map((item) => (item === editColumnOriginal ? column : item))
    setColumnOrder(next)
    updateLocalEntries((prev) =>
      prev.map((entry) => {
        if (!(editColumnOriginal in entry.params)) return entry
        const nextParams = { ...entry.params }
        if (!(column in nextParams)) {
          nextParams[column] = nextParams[editColumnOriginal]
        }
        delete nextParams[editColumnOriginal]
        return { ...entry, params: nextParams }
      })
    )
    setEditColumnOpen(false)
    setEditColumnValue("")
    setEditColumnOriginal(null)
    try {
      localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  const handleDeleteColumn = () => {
    if (!deleteColumn) return
    const next = columnOrderRef.current.filter((col) => col !== deleteColumn)
    setColumnOrder(next)
    updateLocalEntries((prev) =>
      prev.map((entry) => {
        if (!(deleteColumn in entry.params)) return entry
        const nextParams = { ...entry.params }
        delete nextParams[deleteColumn]
        return { ...entry, params: nextParams }
      })
    )
    setDeleteColumn(null)
    try {
      localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  const handleDeleteEntry = () => {
    if (!deleteEntryId) return
    updateLocalEntries((prev) => prev.filter((entry) => entry.id !== deleteEntryId))
    setDeleteEntryId(null)
  }

  const handleClear = () => {
    updateLocalEntries(() => [])
    if (!isColumnLocked) {
      setColumnOrder([])
      try {
        localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify([]))
      } catch {
        // ignore
      }
    }
    setClearOpen(false)
  }

  const handleExport = () => {
    if (!entries.length) {
      showToast("没有可导出的参数", "error")
      return
    }
    const columns = columnOrderRef.current
    const rows = entries.map((entry) => {
      const row: Record<string, string> = {
        名称: entry.name || "",
        价格: entry.price || "",
      }
      columns.forEach((col) => {
        row[col] = entry.params[col] || ""
      })
      return row
    })
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "图片参数")
    const filename = `图片参数_${getTimestamp()}.xlsx`
    XLSX.writeFile(workbook, filename)
    showToast("已导出参数表", "success")
  }

  const handleLockChange = (checked: boolean) => {
    setIsColumnLocked(checked)
    try {
      localStorage.setItem(COLUMN_LOCK_KEY, String(checked))
    } catch {
      // ignore
    }
    if (checked) {
      const next = columnOrderRef.current.slice()
      try {
        localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      showToast("已固定当前列，不会再新增列", "info")
    } else {
      showToast("已解除固定", "info")
    }
  }

  const handleReorderColumn = (from: string, to: string) => {
    setColumnOrder((prev) => {
      const next = [...prev]
      const fromIndex = next.indexOf(from)
      const toIndex = next.indexOf(to)
      if (fromIndex === -1 || toIndex === -1) return prev
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      try {
        localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const handlePreviewImage = (entry: RecognizeEntry) => {
    setPreviewImage({
      src: entry.image,
      title: entry.name || entry.filename || "预览图片",
    })
  }

  return (
    <>
      <RecognizePageView
        entries={entries}
        columns={columnOrder}
        isProcessing={isProcessing}
        isDragging={isDragging}
        isColumnLocked={isColumnLocked}
        draggingColumn={draggingColumn}
        dragOverColumn={dragOverColumn}
        inputRef={inputRef}
        onOpenFilePicker={openFilePicker}
        onInputChange={handleInputChange}
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragEnter={(event) => {
          event.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onStartDragColumn={setDraggingColumn}
        onEndDragColumn={() => setDraggingColumn(null)}
        onDragOverColumn={setDragOverColumn}
        onDropColumn={(column) => {
          if (!draggingColumn || draggingColumn === column) return
          handleReorderColumn(draggingColumn, column)
          setDraggingColumn(null)
        }}
        onEditColumn={(column) => {
          setEditColumnOriginal(column)
          setEditColumnValue(column)
          setEditColumnOpen(true)
        }}
        onDeleteColumn={setDeleteColumn}
        onPreviewImage={handlePreviewImage}
        onDeleteEntry={setDeleteEntryId}
        onAddColumn={() => setAddColumnOpen(true)}
        onExport={handleExport}
        onClear={() => setClearOpen(true)}
        onLockChange={handleLockChange}
      />
      <RecognizeDialogs
        addColumnOpen={addColumnOpen}
        addColumnValue={addColumnValue}
        onAddColumnValueChange={setAddColumnValue}
        onAddColumnOpenChange={setAddColumnOpen}
        onAddColumn={handleAddColumn}
        editColumnOpen={editColumnOpen}
        editColumnValue={editColumnValue}
        onEditColumnValueChange={setEditColumnValue}
        onEditColumnOpenChange={(open) => {
          if (!open) {
            setEditColumnOpen(false)
            setEditColumnValue("")
            setEditColumnOriginal(null)
          } else {
            setEditColumnOpen(true)
          }
        }}
        onEditColumn={handleEditColumn}
        previewImage={previewImage}
        onPreviewOpenChange={(open) => {
          if (!open) setPreviewImage(null)
        }}
        deleteEntryId={deleteEntryId}
        onDeleteEntryOpenChange={(open) => {
          if (!open) setDeleteEntryId(null)
        }}
        onDeleteEntry={handleDeleteEntry}
        deleteColumn={deleteColumn}
        onDeleteColumnOpenChange={(open) => {
          if (!open) setDeleteColumn(null)
        }}
        onDeleteColumn={handleDeleteColumn}
        clearOpen={clearOpen}
        onClearOpenChange={setClearOpen}
        onClear={handleClear}
        progressOpen={progressOpen}
        progressTitle="识别进度"
        progressStatus={progressStatus}
        progressTotal={progressTotal}
        progressProcessed={progressProcessed}
        progressSuccess={progressSuccess}
        progressFailures={progressFailures}
        onProgressCancel={() => {
          progressCancelRef.current = true
          setProgressStatus("cancelled")
        }}
        onProgressOpenChange={(open) => setProgressOpen(open)}
      />
    </>
  )
}

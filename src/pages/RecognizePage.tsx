import { useEffect, useRef, useState } from "react"
import Empty from "@/components/Empty"
import PrimaryButton from "@/components/PrimaryButton"
import { useToast } from "@/components/Toast"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Field, FieldContent, FieldDescription, FieldLabel, FieldSet } from "@/components/ui/field"
import * as XLSX from "xlsx"

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? ""

const ENTRY_STORAGE_KEY = "image_params_entries"
const COLUMN_ORDER_KEY = "image_params_column_order"
const COLUMN_LOCK_KEY = "image_params_column_lock"

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

type RecognizeEntry = {
  id: string
  name: string
  price: string
  image: string
  filename?: string
  createdAt?: number
  params: Record<string, string>
}

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
  if (/(?:g|kg|千克|克|斤)(?:$|\b)/i.test(textValue)) return ""
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
    /\s*参数(图片|图)?\s*\d*$/i,
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
    const looksLikeWeight = /(g|kg|千克|克|斤)(?:$|\b)/i.test(str)
    if (!isPriceLabel && looksLikeWeight) return
    const hasCurrency = /￥|元|人民币|rmb|cny|usd|美元|hkd|港币/i.test(str)
    if (!isPriceLabel && !hasCurrency) return
    candidates.push({ value: str, weight })
  }

  const pushFromObject = (obj: Record<string, unknown> | undefined) => {
    if (!obj) return
    Object.entries(obj).forEach(([key, value]) => {
      const normalizedKey = normalizeColumnKey(key)
      const isPriceLabel =
        isPriceColumnKey(normalizedKey) ||
        /(price|cost|售价|到手|参考|官方|入手|优惠|活动|标价|定价|价格)/i.test(String(key))
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
  let summaryKey = summaryAliasKeys.find((key) => params[key])
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

export default function RecognizePage() {
  const { showToast } = useToast()
  const [entries, setEntries] = useState<RecognizeEntry[]>([])
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [isColumnLocked, setIsColumnLocked] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [draggingColumn, setDraggingColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  const [addColumnOpen, setAddColumnOpen] = useState(false)
  const [addColumnValue, setAddColumnValue] = useState("")
  const [editColumnOpen, setEditColumnOpen] = useState(false)
  const [editColumnValue, setEditColumnValue] = useState("")
  const [editColumnOriginal, setEditColumnOriginal] = useState<string | null>(null)

  const [deleteColumn, setDeleteColumn] = useState<string | null>(null)
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const inputRef = useRef<HTMLInputElement | null>(null)
  const columnOrderRef = useRef<string[]>([])

  useEffect(() => {
    columnOrderRef.current = columnOrder
  }, [columnOrder])

  useEffect(() => {
    try {
      const rawEntries = localStorage.getItem(ENTRY_STORAGE_KEY)
      if (rawEntries) {
        const list = JSON.parse(rawEntries)
        if (Array.isArray(list)) {
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
    try {
      localStorage.setItem(ENTRY_STORAGE_KEY, JSON.stringify(entries))
    } catch {
      // ignore
    }
  }, [entries])

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
    setIsProcessing(true)
    try {
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i]
        if (!file.type.startsWith("image/")) {
          showToast(`文件 ${file.name} 不是图片，已跳过`, "error")
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
          setEntries((prev) => [...prev, entry])
        } catch (error) {
          const message = error instanceof Error ? error.message : "识别失败"
          showToast(`识别失败: ${message}`, "error")
        }
      }
    } finally {
      setIsProcessing(false)
    }
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length) {
      handleFiles(files).catch(() => {})
    }
    event.target.value = ""
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const files = Array.from(event.dataTransfer.files || [])
    if (files.length) {
      handleFiles(files).catch(() => {})
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
    setEntries((prev) =>
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
    setEntries((prev) =>
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
    setEntries((prev) =>
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
    setEntries((prev) => prev.filter((entry) => entry.id !== deleteEntryId))
    setDeleteEntryId(null)
  }

  const handleClear = () => {
    setEntries([])
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

  const columns = columnOrder
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">获取商品参数</h2>
            <p className="mt-1 text-sm text-slate-500">
              上传商品图片后自动识别参数，支持导出表格。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={openFilePicker} disabled={isProcessing}>
              {isProcessing ? "识别中..." : "新增商品"}
            </PrimaryButton>
            <PrimaryButton onClick={() => setAddColumnOpen(true)}>新增列</PrimaryButton>
            <PrimaryButton onClick={handleExport}>导出参数</PrimaryButton>
            <Button
              variant="ghost"
              className="text-rose-500 hover:text-rose-600"
              onClick={() => setClearOpen(true)}
              disabled={!entries.length}
            >
              全部清空
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Checkbox
              checked={isColumnLocked}
              onCheckedChange={(value) => handleLockChange(Boolean(value))}
            />
            <span className="text-sm text-slate-600">固定列</span>
            <span className="text-xs text-slate-400">固定当前列，不会再新增列</span>
          </div>
          <div className="text-xs text-slate-400">共 {entries.length} 条</div>
        </div>

        <div
          className={`mt-4 flex min-h-[160px] cursor-pointer items-center justify-center rounded-2xl border border-dashed px-6 text-center text-sm transition ${
            isDragging
              ? "border-brand bg-brand/5 text-brand"
              : "border-slate-200 bg-slate-50 text-slate-500"
          }`}
          onClick={openFilePicker}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragEnter={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <div>
            <p className="text-sm font-medium text-slate-700">拖拽图片到此处，或点击上传</p>
            <p className="mt-2 text-xs text-slate-400">支持多张图片批量识别</p>
          </div>
        </div>

        <div className="mt-6 overflow-auto rounded-2xl border border-slate-200">
          {entries.length === 0 ? (
            <div className="p-10">
              <Empty
                title="暂无识别结果"
                description="还没有添加图片，点击“新增商品”上传后即可在此查看。"
              />
            </div>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">图片</th>
                  <th className="px-4 py-3">名称</th>
                  <th className="px-4 py-3">价格</th>
                  {columns.map((col) => (
                    <th
                      key={col}
                      draggable
                      onDragStart={() => setDraggingColumn(col)}
                      onDragEnd={() => setDraggingColumn(null)}
                      onDragOver={(event) => {
                        event.preventDefault()
                        setDragOverColumn(col)
                      }}
                      onDragLeave={() => setDragOverColumn(null)}
                      onDrop={(event) => {
                        event.preventDefault()
                        setDragOverColumn(null)
                        if (!draggingColumn || draggingColumn === col) return
                        setColumnOrder((prev) => {
                          const next = [...prev]
                          const from = next.indexOf(draggingColumn)
                          const to = next.indexOf(col)
                          if (from === -1 || to === -1) return prev
                          const [moved] = next.splice(from, 1)
                          next.splice(to, 0, moved)
                          try {
                            localStorage.setItem(COLUMN_ORDER_KEY, JSON.stringify(next))
                          } catch {
                            // ignore
                          }
                          return next
                        })
                        setDraggingColumn(null)
                      }}
                      onDoubleClick={() => {
                        setEditColumnOriginal(col)
                        setEditColumnValue(col)
                        setEditColumnOpen(true)
                      }}
                      className={`min-w-[140px] border-l border-slate-200 px-4 py-3 transition ${
                        dragOverColumn === col ? "bg-slate-100" : ""
                      }`}
                      title="双击编辑列名"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{col}</span>
                        <button
                          type="button"
                          className="text-xs text-rose-500 hover:text-rose-600"
                          onClick={(event) => {
                            event.stopPropagation()
                            setDeleteColumn(col)
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="px-4 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-slate-200">
                    <td className="px-4 py-3">
                      {entry.image ? (
                        <button
                          type="button"
                          className="h-16 w-16 overflow-hidden rounded-lg border border-slate-200"
                          onClick={() =>
                            setPreviewImage({
                              src: entry.image,
                              title: entry.name || entry.filename || "预览图片",
                            })
                          }
                        >
                          <img
                            src={entry.image}
                            alt={entry.name}
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[240px] truncate text-slate-700">
                        {entry.name || "未命名商品"}
                      </div>
                    </td>
                    <td className="px-4 py-3">{entry.price || "-"}</td>
                    {columns.map((col) => (
                      <td key={`${entry.id}-${col}`} className="px-4 py-3">
                        {entry.params[col] || "-"}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-rose-500 hover:text-rose-600"
                        onClick={() => setDeleteEntryId(entry.id)}
                      >
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={handleInputChange}
      />

      <Dialog open={addColumnOpen} onOpenChange={setAddColumnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增列</DialogTitle>
            <DialogDescription>填写新的参数列名称。</DialogDescription>
          </DialogHeader>
          <FieldSet>
            <Field>
              <FieldLabel>列名</FieldLabel>
              <FieldContent>
                <Input
                  value={addColumnValue}
                  onChange={(event) => setAddColumnValue(event.target.value)}
                  placeholder="例如：续航"
                />
              </FieldContent>
              <FieldDescription>新列会自动追加到表格末尾。</FieldDescription>
            </Field>
          </FieldSet>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setAddColumnOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleAddColumn}>
              新增
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editColumnOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditColumnOpen(false)
            setEditColumnValue("")
            setEditColumnOriginal(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑列名</DialogTitle>
            <DialogDescription>双击列头可快速修改。</DialogDescription>
          </DialogHeader>
          <FieldSet>
            <Field>
              <FieldLabel>列名</FieldLabel>
              <FieldContent>
                <Input
                  value={editColumnValue}
                  onChange={(event) => setEditColumnValue(event.target.value)}
                />
              </FieldContent>
            </Field>
          </FieldSet>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setEditColumnOpen(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleEditColumn}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(previewImage)}
        onOpenChange={(open) => {
          if (!open) setPreviewImage(null)
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>图片预览</DialogTitle>
          </DialogHeader>
          {previewImage ? (
            <div className="space-y-4">
              <div className="text-sm text-slate-600">{previewImage.title}</div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <img src={previewImage.src} alt={previewImage.title} className="w-full" />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteEntryId)} onOpenChange={() => setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除识别记录</AlertDialogTitle>
            <AlertDialogDescription>确认删除该识别记录吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteEntryId(null)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteColumn)} onOpenChange={() => setDeleteColumn(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除参数列</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除列“{deleteColumn}”吗？该列数据将被移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteColumn(null)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteColumn}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空识别记录</AlertDialogTitle>
            <AlertDialogDescription>确认清空所有识别记录吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClearOpen(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear}>确认清空</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
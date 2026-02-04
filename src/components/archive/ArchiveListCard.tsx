import { Button } from "@/components/ui/button"
import { InteractiveCard } from "@/components/ui/interactive-card"
import { GripVertical, Pencil, Star, Trash2 } from "lucide-react"

interface ParamEntry {
  key: string
  value: string
}

interface ArchiveListCardProps {
  id: string
  title: string
  price: string
  commission: string
  commissionRate: string
  jdPrice?: string
  jdCommission?: string
  jdCommissionRate?: string
  jdSales?: string
  tbPrice?: string
  tbCommission?: string
  tbCommissionRate?: string
  tbSales?: string
  sales30: string
  comments: string
  image: string
  shopName: string
  uid: string
  source: string
  blueLink: string
  params: ParamEntry[]
  remark: string
  missingTips: string[]
  isFocused: boolean
  onToggleFocus: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onDragStart: (id: string) => void
  onDrop: (id: string) => void
  onAddToScheme?: (id: string) => void
  onCoverClick?: () => void
  onCardClick?: () => void
}

const TEXT = {
  price: "商品价格",
  commission: "佣金",
  commissionRate: "佣金比例",
  sales30: "30天销量",
  comments: "评价数",
  uidLabel: "商品ID：",
  sourceLabel: "来源：",
  matchParams: "匹配参数",
  remarkLabel: "总结：",
  missingLabel: "缺失：",
  yuan: "元",
  colon: "：",
  sep: "、",
}

const decodeUnicodeEscapes = (value: string) => {
  if (!value) return value
  return value.replace(/\\u([0-9a-fA-F]{4})/g, (_match, code) =>
    String.fromCharCode(parseInt(code, 16))
  )
}

const formatLabel = (value: string) => {
  const decoded = decodeUnicodeEscapes(value)
  if (!decoded) return decoded
  return decoded.endsWith(TEXT.colon) ? decoded : `${decoded}${TEXT.colon}`
}

const truncateTitle = (value: string) => {
  if (!value) return "--"
  return value.length > 15 ? `${value.slice(0, 15)}...` : value
}

const resolveMetric = (value?: string, fallback?: string) => {
  const trimmed = String(value ?? "").trim()
  if (trimmed) return trimmed
  const fallbackText = String(fallback ?? "").trim()
  return fallbackText || "--"
}

const formatAmount = (value: string) => {
  if (!value || value === "--") return "--"
  return `${value}${TEXT.yuan}`
}

export default function ArchiveListCard({
  id,
  title,
  price,
  commission,
  commissionRate,
  jdPrice,
  jdCommission,
  jdCommissionRate,
  jdSales,
  tbPrice,
  tbCommission,
  tbCommissionRate,
  tbSales,
  sales30,
  comments,
  image,
  shopName,
  uid,
  source,
  blueLink,
  params,
  remark,
  missingTips,
  isFocused,
  onToggleFocus,
  onEdit,
  onDelete,
  onDragStart,
  onDrop,
  onAddToScheme,
  onCoverClick,
  onCardClick,
}: ArchiveListCardProps) {
  const normalizedMissingTips = missingTips.map((tip) => decodeUnicodeEscapes(tip))
  const hasMissing = normalizedMissingTips.length > 0
  const coverCursorClass = onCoverClick ? "cursor-pointer" : ""
  const isInteractive = Boolean(onCardClick)
  const handleAddToScheme = () => {
    if (!onAddToScheme) return
    onAddToScheme(id)
  }
  const handleDragStart = (event: React.DragEvent<HTMLSpanElement>) => {
    const card = event.currentTarget.closest("[data-archive-card]")
    if (card && event.dataTransfer?.setDragImage) {
      event.dataTransfer.setDragImage(card, card.clientWidth / 2, card.clientHeight / 2)
    }
    if (event.dataTransfer?.setData) {
      event.dataTransfer.setData("text/plain", id)
    }
    onDragStart(id)
  }
  const jdMetrics = {
    price: resolveMetric(jdPrice, price),
    commission: resolveMetric(jdCommission, commission),
    commissionRate: resolveMetric(jdCommissionRate, commissionRate),
    sales: resolveMetric(jdSales, sales30),
  }
  const tbMetrics = {
    price: resolveMetric(tbPrice),
    commission: resolveMetric(tbCommission),
    commissionRate: resolveMetric(tbCommissionRate),
    sales: resolveMetric(tbSales),
  }

  const renderInlineMetric = (label: string, value: string, valueClass: string) => (
    <div className="flex flex-col items-start gap-3 whitespace-nowrap" data-testid="archive-metric-item">
      <span className="text-[13px] leading-none text-slate-400 tracking-wider" data-testid="archive-metric-label">
        {label}
      </span>
      <span className={`leading-none ${valueClass}`}>{value}</span>
    </div>
  )

  return (
    <InteractiveCard
      interactive={isInteractive}
      className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card"
      data-archive-card
      data-testid="archive-card-body"
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(id)}
      onClick={onCardClick}
    >
      <div className="flex gap-5">
        <div
          className={`relative h-[140px] w-[140px] shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${coverCursorClass}`}
          data-testid="archive-card-cover"
          onClick={(event) => {
            event.stopPropagation()
            onCoverClick?.()
          }}
        >
          {image ? (
            <img
              src={image}
              alt={title}
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          ) : null}
          <Button
            type="button"
            variant={isFocused ? "default" : "outline"}
            size="icon"
            className={
              isFocused
                ? "absolute left-2 top-2 h-7 w-7 bg-brand text-white"
                : "absolute left-2 top-2 h-7 w-7 bg-white text-slate-400"
            }
            onClick={(event) => {
              event.stopPropagation()
              onToggleFocus(id)
            }}
          >
            <Star className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 min-h-[140px] flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900">
                {truncateTitle(decodeUnicodeEscapes(title))}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 cursor-grab"
                role="img"
                aria-label="Drag handle"
                draggable
                onClick={(event) => event.stopPropagation()}
                onDragStart={handleDragStart}
              >
                <GripVertical className="h-4 w-4" aria-hidden="true" />
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="archive-add-scheme"
                onClick={(event) => {
                  event.stopPropagation()
                  handleAddToScheme()
                }}
              >
                加入方案
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-slate-500"
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit(id)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-rose-500"
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(id)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div
            className="mt-3 flex items-start gap-3 text-[16px] text-slate-500 flex-nowrap"
            data-testid="archive-metrics-row"
          >
            <div
              className="flex items-start gap-2 rounded-xl bg-[#fbfcfd] px-7 py-3 flex-1 min-w-[350px]"
              data-testid="archive-metrics-jd"
            >
              <span
                className="inline-flex h-[40px] w-[40px] min-h-[40px] min-w-[40px] flex-none self-start items-center justify-center rounded-lg bg-rose-500 text-[16px] font-semibold leading-none text-white text-center -translate-x-[6px]"
                data-testid="archive-metrics-badge-jd"
              >
                JD
              </span>
              <div className="flex items-start gap-10 flex-1 min-w-0 overflow-visible" data-testid="archive-metrics-list">
                {renderInlineMetric(TEXT.price, formatAmount(jdMetrics.price), "font-semibold text-slate-900")}
                {renderInlineMetric(TEXT.commission, formatAmount(jdMetrics.commission), "font-semibold text-emerald-600")}
                {renderInlineMetric(TEXT.commissionRate, jdMetrics.commissionRate || "--", "font-semibold text-rose-500")}
                {renderInlineMetric(TEXT.sales30, jdMetrics.sales || "--", "font-semibold text-slate-900")}
              </div>
            </div>
            <div
              className="flex items-start gap-2 rounded-xl bg-[#fbfcfd] px-7 py-3 flex-1 min-w-[350px]"
              data-testid="archive-metrics-tb"
            >
              <span
                className="inline-flex h-[40px] w-[40px] min-h-[40px] min-w-[40px] flex-none self-start items-center justify-center rounded-lg bg-amber-500 text-[16px] font-semibold leading-none text-white text-center -translate-x-[6px]"
                data-testid="archive-metrics-badge-tb"
              >
                TB
              </span>
              <div className="flex items-start gap-10 flex-1 min-w-0 overflow-visible" data-testid="archive-metrics-list">
                {renderInlineMetric(TEXT.price, formatAmount(tbMetrics.price), "font-semibold text-slate-900")}
                {renderInlineMetric(TEXT.commission, formatAmount(tbMetrics.commission), "font-semibold text-emerald-600")}
                {renderInlineMetric(TEXT.commissionRate, tbMetrics.commissionRate || "--", "font-semibold text-rose-500")}
                {renderInlineMetric(TEXT.sales30, tbMetrics.sales || "--", "font-semibold text-slate-900")}
              </div>
            </div>
          </div>
          <div
            className="mt-auto flex min-w-0 items-center gap-4 text-xs text-slate-400"
            data-testid="archive-meta-row"
          >
            <span className="whitespace-nowrap">{TEXT.uidLabel}{uid || "--"}</span>
            <span className="min-w-0 truncate">
              {TEXT.sourceLabel}{decodeUnicodeEscapes(source) || "--"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl p-4 bg-[#fbfcfd]">
        <div className="flex items-start justify-between gap-4">
          <div className="grid flex-1 gap-3 md:grid-cols-3">
            {params.map((entry, index) => (
              <div key={`${entry.key}-${index}`} className="text-xs">
                <span className="text-slate-400">{formatLabel(entry.key)}</span>
                <span className="text-slate-700">
                  {decodeUnicodeEscapes(entry.value) || "--"}
                </span>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation()
              onEdit(id)
            }}
          >
            {TEXT.matchParams}
          </Button>
        </div>
        <div className="mt-3 border-t border-slate-200 pt-3 text-xs text-slate-600">
          <span className="text-slate-400">{TEXT.remarkLabel}</span>
          <span>{decodeUnicodeEscapes(remark) || "--"}</span>
        </div>
        {hasMissing ? (
          <div className="mt-2 text-xs text-rose-500">
            {TEXT.missingLabel}{normalizedMissingTips.join(TEXT.sep)}
          </div>
        ) : null}
      </div>
    </InteractiveCard>
  )
}

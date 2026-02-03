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
  shopLabel: "店铺：",
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

export default function ArchiveListCard({
  id,
  title,
  price,
  commission,
  commissionRate,
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

  return (
    <InteractiveCard
      interactive={isInteractive}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card"
      data-archive-card
      data-testid="archive-card-body"
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(id)}
      onClick={onCardClick}
    >
      <div className="flex gap-5">
        <div
          className={`relative h-[140px] w-[120px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${coverCursorClass}`}
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

        <div className="flex-1 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {truncateTitle(decodeUnicodeEscapes(title))}
              </h3>
              <div className="mt-4 grid gap-4 text-xs text-slate-500 md:grid-cols-5">
                <div>
                  <div className="text-sm text-slate-400">{TEXT.price}</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {price === "--" ? "--" : `${price}${TEXT.yuan}`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">{TEXT.commission}</div>
                  <div className="mt-1 text-base font-semibold text-emerald-600">
                    {commission === "--" ? "--" : `${commission}${TEXT.yuan}`}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">{TEXT.commissionRate}</div>
                  <div className="mt-1 text-base font-semibold text-rose-500">
                    {commissionRate || "--"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">{TEXT.sales30}</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {sales30 || "--"}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">{TEXT.comments}</div>
                  <div className="mt-1 text-base font-semibold text-slate-900">
                    {comments || "--"}
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-4 text-xs text-slate-400">
                <span>{TEXT.shopLabel}{decodeUnicodeEscapes(shopName) || "--"}</span>
                <span>{TEXT.uidLabel}{uid || "--"}</span>
                <span className="max-w-[280px] truncate">
                  {TEXT.sourceLabel}{decodeUnicodeEscapes(source || blueLink || "") || "--"}
                </span>
              </div>
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
        </div>
      </div>

      <div
        className={`mt-4 rounded-xl border p-4 ${
          hasMissing ? "border-rose-300" : "border-slate-200"
        } bg-slate-50`}
      >
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

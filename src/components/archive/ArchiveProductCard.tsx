import Badge from "@/components/Badge"
import PrimaryButton from "@/components/PrimaryButton"
import Tooltip from "@/components/Tooltip"

interface ParamEntry {
  key: string
  value: string
}

interface ArchiveProductCardProps {
  id: string
  title: string
  price: string
  commission: string
  image: string
  categoryName: string
  accountName: string
  blueLink: string
  params: ParamEntry[]
  remark: string
  missingTips: string[]
  isFocused: boolean
  onToggleFocus: (id: string) => void
  onCopyLink: (id: string) => void
  onEdit: (id: string) => void
  onDragStart: (id: string) => void
  onDrop: (id: string) => void
}

export default function ArchiveProductCard({
  id,
  title,
  price,
  commission,
  image,
  categoryName,
  accountName,
  blueLink,
  params,
  remark,
  missingTips,
  isFocused,
  onToggleFocus,
  onCopyLink,
  onEdit,
  onDragStart,
  onDrop,
}: ArchiveProductCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${
        missingTips.length > 0 ? "border-rose-300" : "border-slate-200"
      } bg-white shadow-card`}
      draggable
      onDragStart={() => onDragStart(id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={() => onDrop(id)}
    >
      <button
        className={`absolute left-4 top-4 h-7 w-7 rounded-md border ${
          isFocused
            ? "border-brand bg-brand text-white"
            : "border-slate-200 bg-white text-slate-400"
        } text-xs font-semibold shadow`}
        type="button"
        onClick={() => onToggleFocus(id)}
      >
        ★
      </button>

      <div className="absolute right-4 top-4 flex items-center gap-2">
        <Badge label={categoryName} tone="primary" />
        <Tooltip content="拖拽排序">
          <span className="cursor-grab rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500">
            拖拽
          </span>
        </Tooltip>
      </div>

      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <img src={image} alt={title} className="h-full w-full object-cover" />
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <h3 className="truncate text-base font-semibold text-slate-900">
            {title.length > 15 ? `${title.slice(0, 15)}...` : title}
          </h3>
          <div className="text-xs text-slate-500">
            账号：{accountName || "未分配"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-400">价格</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {price === "--" ? "--" : `${price} 元`}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-400">佣金</p>
            <p className="mt-1 text-base font-semibold text-slate-900">
              {commission === "--" ? "--" : `${commission} 元`}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500">参数信息</p>
          <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
            {params.map((entry, index) => (
              <div
                key={`${entry.key}-${index}`}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-slate-600"
                title={`${entry.key}: ${entry.value}`}
              >
                {entry.key.length > 15 ? `${entry.key.slice(0, 15)}...` : entry.key}
                <span className="block truncate text-slate-400">
                  {entry.value}
                </span>
              </div>
            ))}
          </div>
          <div className="text-xs text-slate-500">
            总结：{remark || "—"}
          </div>
          {missingTips.length > 0 ? (
            <div className="text-xs text-rose-500">
              缺失参数：{missingTips.join("、")}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 truncate text-xs text-slate-500">
            蓝链：{blueLink}
          </div>
          <div className="flex gap-2">
            <PrimaryButton onClick={() => onCopyLink(id)} type="button">
              复制
            </PrimaryButton>
            <PrimaryButton onClick={() => onEdit(id)} type="button">
              编辑
            </PrimaryButton>
          </div>
        </div>
      </div>
    </div>
  )
}

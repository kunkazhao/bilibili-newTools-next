import { Button } from "@/components/ui/button"

type SchemeDetailHeaderProps = {
  name: string
  categoryName: string
  itemCount: number
  createdAt: string
  onBack: () => void
}

export default function SchemeDetailHeader({
  name,
  categoryName,
  itemCount,
  createdAt,
  onBack,
}: SchemeDetailHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">方案：{name}</span>
        <span>分类：{categoryName}</span>
        <span>选品数量：{itemCount}</span>
        <span>创建时间：{createdAt}</span>
      </div>
      <Button variant="outline" onClick={onBack}>
        返回方案列表
      </Button>
    </div>
  )
}

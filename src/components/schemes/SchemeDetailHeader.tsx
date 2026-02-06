import { Button } from "@/components/ui/button"

type SchemeDetailHeaderProps = {
  name: string
  categoryName: string
  itemCount: number
  createdAt: string
  onBack: () => void
  onExportJson: () => void
  onExportExcel: () => void
  onOpenFeishu: () => void
}

export default function SchemeDetailHeader({
  name,
  categoryName,
  itemCount,
  createdAt,
  onExportJson,
  onExportExcel,
  onOpenFeishu,
}: SchemeDetailHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">方案：{name}</span>
        <span>分类：{categoryName}</span>
        <span>选品数量：{itemCount}</span>
        <span>创建时间：{createdAt}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onExportJson}>
          导出json
        </Button>
        <Button variant="outline" onClick={onExportExcel}>
          导出Excel
        </Button>
        <Button variant="outline" onClick={onOpenFeishu}>
          写入飞书表格
        </Button>
      </div>
    </div>
  )
}

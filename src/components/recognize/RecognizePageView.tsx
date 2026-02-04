import type { ChangeEvent, DragEvent, RefObject } from "react"
import Empty from "@/components/Empty"
import PrimaryButton from "@/components/PrimaryButton"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { X } from "lucide-react"
import type { RecognizeEntry } from "./types"

interface RecognizePageViewProps {
  entries: RecognizeEntry[]
  columns: string[]
  isProcessing: boolean
  isDragging: boolean
  isColumnLocked: boolean
  draggingColumn: string | null
  dragOverColumn: string | null
  inputRef: RefObject<HTMLInputElement>
  onOpenFilePicker: () => void
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDragEnter: (event: DragEvent<HTMLDivElement>) => void
  onDragLeave: () => void
  onStartDragColumn: (column: string) => void
  onEndDragColumn: () => void
  onDragOverColumn: (column: string | null) => void
  onDropColumn: (column: string) => void
  onEditColumn: (column: string) => void
  onDeleteColumn: (column: string) => void
  onPreviewImage: (entry: RecognizeEntry) => void
  onDeleteEntry: (entryId: string) => void
  onAddColumn: () => void
  onExport: () => void
  onClear: () => void
  onLockChange: (checked: boolean) => void
}

export default function RecognizePageView({
  entries,
  columns,
  isProcessing,
  isDragging,
  isColumnLocked,
  draggingColumn,
  dragOverColumn,
  inputRef,
  onOpenFilePicker,
  onInputChange,
  onDrop,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onStartDragColumn,
  onEndDragColumn,
  onDragOverColumn,
  onDropColumn,
  onEditColumn,
  onDeleteColumn,
  onPreviewImage,
  onDeleteEntry,
  onAddColumn,
  onExport,
  onClear,
  onLockChange,
}: RecognizePageViewProps) {
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
            <PrimaryButton onClick={onOpenFilePicker} disabled={isProcessing}>
              {isProcessing ? "识别中..." : "新增商品"}
            </PrimaryButton>
            <PrimaryButton onClick={onAddColumn}>新增列</PrimaryButton>
            <PrimaryButton onClick={onExport}>导出参数</PrimaryButton>
            <Button
              variant="ghost"
              className="text-rose-500 hover:text-rose-600"
              onClick={onClear}
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
            <Switch
              aria-label="固定列"
              checked={isColumnLocked}
              onCheckedChange={(value) => onLockChange(Boolean(value))}
            />
            <span className="text-sm text-slate-600">固定列</span>
            <span className="text-xs text-slate-400">固定当前列，不会再新增列</span>
          </div>
          <div className="text-xs text-slate-400">共 {entries.length} 条</div>
        </div>

        <div className="mt-6 overflow-auto rounded-2xl border border-slate-200">
          {entries.length === 0 ? (
            <div className="p-10">
              <Empty
                title="暂无识别结果"
                description="还没有添加图片，点击“新增商品”上传后即可在此查看。"
                hideTitle
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
                      onDragStart={() => onStartDragColumn(col)}
                      onDragEnd={onEndDragColumn}
                      onDragOver={(event) => {
                        event.preventDefault()
                        onDragOverColumn(col)
                      }}
                      onDragLeave={() => onDragOverColumn(null)}
                      onDrop={(event) => {
                        event.preventDefault()
                        onDragOverColumn(null)
                        if (!draggingColumn || draggingColumn === col) return
                        onDropColumn(col)
                      }}
                      onDoubleClick={() => onEditColumn(col)}
                      className={`min-w-[140px] border-l border-slate-200 px-4 py-3 transition ${
                        dragOverColumn === col ? "bg-slate-100" : ""
                      }`}
                      title="双击编辑列名"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span>{col}</span>
                        <button
                          type="button"
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:text-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                          aria-label="删除列"
                          onClick={(event) => {
                            event.stopPropagation()
                            onDeleteColumn(col)
                          }}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
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
                          onClick={() => onPreviewImage(entry)}
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
                        onClick={() => onDeleteEntry(entry.id)}
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
        name="recognize-images"
        aria-label="Upload images"
        onChange={onInputChange}
      />
    </div>
  )
}

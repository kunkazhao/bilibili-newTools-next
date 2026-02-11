import { useId } from "react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import ProgressDialog from "@/components/ProgressDialog"
import { Input } from "@/components/ui/input"
import { Field, FieldContent, FieldDescription, FieldLabel, FieldSet } from "@/components/ui/field"
import type { PreviewImage } from "./types"

interface RecognizeDialogsProps {
  addColumnOpen: boolean
  addColumnValue: string
  onAddColumnValueChange: (value: string) => void
  onAddColumnOpenChange: (open: boolean) => void
  onAddColumn: () => void

  editColumnOpen: boolean
  editColumnValue: string
  onEditColumnValueChange: (value: string) => void
  onEditColumnOpenChange: (open: boolean) => void
  onEditColumn: () => void

  previewImage: PreviewImage | null
  onPreviewOpenChange: (open: boolean) => void

  deleteEntryId: string | null
  onDeleteEntryOpenChange: (open: boolean) => void
  onDeleteEntry: () => void

  deleteColumn: string | null
  onDeleteColumnOpenChange: (open: boolean) => void
  onDeleteColumn: () => void

  clearOpen: boolean
  onClearOpenChange: (open: boolean) => void
  onClear: () => void

  progressOpen: boolean
  progressTitle: string
  progressStatus: "running" | "done" | "cancelled" | "error"
  progressTotal: number
  progressProcessed: number
  progressSuccess: number
  progressFailures: Array<{ name: string; reason?: string; link?: string }>
  onProgressCancel: () => void
  onProgressOpenChange: (open: boolean) => void
}

export default function RecognizeDialogs({
  addColumnOpen,
  addColumnValue,
  onAddColumnValueChange,
  onAddColumnOpenChange,
  onAddColumn,
  editColumnOpen,
  editColumnValue,
  onEditColumnValueChange,
  onEditColumnOpenChange,
  onEditColumn,
  previewImage,
  onPreviewOpenChange,
  deleteEntryId,
  onDeleteEntryOpenChange,
  onDeleteEntry,
  deleteColumn,
  onDeleteColumnOpenChange,
  onDeleteColumn,
  clearOpen,
  onClearOpenChange,
  onClear,
  progressOpen,
  progressTitle,
  progressStatus,
  progressTotal,
  progressProcessed,
  progressSuccess,
  progressFailures,
  onProgressCancel,
  onProgressOpenChange,
}: RecognizeDialogsProps) {
  const baseId = useId()
  const addColumnId = `${baseId}-add-column`
  const editColumnId = `${baseId}-edit-column`
  return (
    <>
      <Dialog open={addColumnOpen} onOpenChange={onAddColumnOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增列</DialogTitle>
            <DialogDescription>填写新的参数列名。</DialogDescription>
          </DialogHeader>
          <FieldSet>
            <Field>
              <FieldLabel htmlFor={addColumnId}>列名</FieldLabel>
              <FieldContent>
                <Input
                  id={addColumnId} value={addColumnValue}
                  onChange={(event) => onAddColumnValueChange(event.target.value)}
                  placeholder="例如：续航"
                />
              </FieldContent>
              <FieldDescription>新列会自动追加到表格末尾。</FieldDescription>
            </Field>
          </FieldSet>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onAddColumnOpenChange(false)}>
              取消
            </Button>
            <Button type="button" onClick={onAddColumn}>
              新增
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editColumnOpen} onOpenChange={onEditColumnOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑列名</DialogTitle>
            <DialogDescription>双击列头可快速修改。</DialogDescription>
          </DialogHeader>
          <FieldSet>
            <Field>
              <FieldLabel htmlFor={editColumnId}>列名</FieldLabel>
              <FieldContent>
                <Input
                  id={editColumnId} value={editColumnValue}
                  onChange={(event) => onEditColumnValueChange(event.target.value)}
                />
              </FieldContent>
            </Field>
          </FieldSet>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => onEditColumnOpenChange(false)}>
              取消
            </Button>
            <Button type="button" onClick={onEditColumn}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(previewImage)} onOpenChange={onPreviewOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>图片预览</DialogTitle>
            <DialogDescription>Image preview.</DialogDescription>
          </DialogHeader>
          {previewImage ? (
            <div className="space-y-4">
              <div className="text-sm text-slate-600">{previewImage.title}</div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <img src={previewImage.src} alt={previewImage.title} className="w-full" loading="lazy" decoding="async" />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteEntryId)} onOpenChange={onDeleteEntryOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除识别记录</AlertDialogTitle>
            <AlertDialogDescription>确认删除该识别记录吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onDeleteEntryOpenChange(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteEntry}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteColumn)} onOpenChange={onDeleteColumnOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除参数列</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除列“{deleteColumn}”吗？该列数据将被移除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onDeleteColumnOpenChange(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteColumn}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={clearOpen} onOpenChange={onClearOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空识别记录</AlertDialogTitle>
            <AlertDialogDescription>确认清空所有识别记录吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => onClearOpenChange(false)}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onClear}>确认清空</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ProgressDialog
        open={progressOpen}
        title={progressTitle}
        status={progressStatus}
        total={progressTotal}
        processed={progressProcessed}
        success={progressSuccess}
        failures={progressFailures}
        showSummary
        showFailures
        allowCancel
        onCancel={onProgressCancel}
        onOpenChange={onProgressOpenChange}
      />
    </>
  )
}

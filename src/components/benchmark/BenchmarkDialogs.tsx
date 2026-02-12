import { useId } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldContent, FieldLabel, FieldSet } from "@/components/ui/field"
import type { BenchmarkCategory, BenchmarkEntry } from "@/components/benchmark/types"

type AddDialogProps = {
  open: boolean
  links: string
  categoryId: string
  note: string
  submitting: boolean
  categories: BenchmarkCategory[]
  onOpenChange: (open: boolean) => void
  onLinksChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onNoteChange: (value: string) => void
  onSubmit: () => void
}

type EditDialogProps = {
  entry: BenchmarkEntry | null
  title: string
  categoryId: string
  note: string
  submitting: boolean
  categories: BenchmarkCategory[]
  onClose: () => void
  onTitleChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onNoteChange: (value: string) => void
  onSubmit: () => void
}

type ConfirmDialogsProps = {
  entry: BenchmarkEntry | null
  onEntryCancel: () => void
  onEntryConfirm: () => void
}

type SubtitleDialogProps = {
  open: boolean
  loading: boolean
  text: string
  onOpenChange: (open: boolean) => void
  onCopy: () => void
}

type BenchmarkDialogsProps = {
  subtitleDialog: SubtitleDialogProps
  addDialog: AddDialogProps
  editDialog: EditDialogProps
  confirmDialogs: ConfirmDialogsProps
}

export default function BenchmarkDialogs({
  subtitleDialog,
  addDialog,
  editDialog,
  confirmDialogs,
}: BenchmarkDialogsProps) {
  const baseId = useId()
  const addLinksId = `${baseId}-add-links`
  const addCategoryId = `${baseId}-add-category`
  const addNoteId = `${baseId}-add-note`
  const editTitleId = `${baseId}-edit-title`
  const editCategoryId = `${baseId}-edit-category`
  const editNoteId = `${baseId}-edit-note`
  const hasSubtitle = subtitleDialog.text.trim().length > 0

  return (
    <>
      <Dialog open={subtitleDialog.open} onOpenChange={subtitleDialog.onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{"字幕内容"}</DialogTitle>
            <DialogDescription>{"自动获取视频字幕，可一键复制。"}</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={12}
            readOnly
            value={subtitleDialog.text}
            placeholder={subtitleDialog.loading ? "正在获取字幕..." : "暂无字幕内容"}
          />
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => subtitleDialog.onOpenChange(false)}
            >
              {"关闭"}
            </Button>
            <Button
              type="button"
              onClick={subtitleDialog.onCopy}
              disabled={!hasSubtitle || subtitleDialog.loading}
            >
              {"复制字幕"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialog.open} onOpenChange={addDialog.onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{"添加对标视频"}</DialogTitle>
            <DialogDescription>
              {"支持粘贴多个 B 站链接或 BV 号，每行一条。"}
            </DialogDescription>
          </DialogHeader>
          <FieldSet>
            <Field>
              <FieldLabel htmlFor={addLinksId}>{"视频链接 / BV 号"}</FieldLabel>
              <FieldContent>
                <Textarea
                  id={addLinksId}
                  rows={6}
                  value={addDialog.links}
                  placeholder="https://www.bilibili.com/video/BV..."
                  onChange={(event) => addDialog.onLinksChange(event.target.value)}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor={addCategoryId}>{"分类"}</FieldLabel>
              <FieldContent>
                <Select value={addDialog.categoryId} onValueChange={addDialog.onCategoryChange}>
                  <SelectTrigger id={addCategoryId}>
                    <SelectValue placeholder={"请选择分类"} />
                  </SelectTrigger>
                  <SelectContent>
                    {addDialog.categories.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor={addNoteId}>{"备注"}</FieldLabel>
              <FieldContent>
                <Input
                  id={addNoteId}
                  value={addDialog.note}
                  placeholder={"可选"}
                  onChange={(event) => addDialog.onNoteChange(event.target.value)}
                />
              </FieldContent>
            </Field>
          </FieldSet>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => addDialog.onOpenChange(false)}
            >
              {"取消"}
            </Button>
            <Button type="button" onClick={addDialog.onSubmit} disabled={addDialog.submitting}>
              {addDialog.submitting ? "提交中..." : "确认添加"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editDialog.entry)}
        onOpenChange={(open) => {
          if (!open) editDialog.onClose()
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{"编辑对标视频"}</DialogTitle>
            <DialogDescription>{"可修改标题、分类和备注。"}</DialogDescription>
          </DialogHeader>
          <FieldSet>
            <Field>
              <FieldLabel htmlFor={editTitleId}>{"标题"}</FieldLabel>
              <FieldContent>
                <Input
                  id={editTitleId}
                  value={editDialog.title}
                  onChange={(event) => editDialog.onTitleChange(event.target.value)}
                  placeholder={"请输入标题"}
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor={editCategoryId}>{"分类"}</FieldLabel>
              <FieldContent>
                <Select value={editDialog.categoryId} onValueChange={editDialog.onCategoryChange}>
                  <SelectTrigger id={editCategoryId}>
                    <SelectValue placeholder={"请选择分类"} />
                  </SelectTrigger>
                  <SelectContent>
                    {editDialog.categories.map((item) => (
                      <SelectItem key={item.id} value={String(item.id)}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor={editNoteId}>{"备注"}</FieldLabel>
              <FieldContent>
                <Input
                  id={editNoteId}
                  value={editDialog.note}
                  placeholder={"可选"}
                  onChange={(event) => editDialog.onNoteChange(event.target.value)}
                />
              </FieldContent>
            </Field>
          </FieldSet>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={editDialog.onClose}>
              {"取消"}
            </Button>
            <Button type="button" onClick={editDialog.onSubmit} disabled={editDialog.submitting}>
              {editDialog.submitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(confirmDialogs.entry)}
        onOpenChange={(open) => {
          if (!open) confirmDialogs.onEntryCancel()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{"删除对标视频"}</AlertDialogTitle>
            <AlertDialogDescription>
              {"确认删除该对标视频吗？此操作不可撤销。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={confirmDialogs.onEntryCancel}>{"取消"}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialogs.onEntryConfirm}>{"确认删除"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

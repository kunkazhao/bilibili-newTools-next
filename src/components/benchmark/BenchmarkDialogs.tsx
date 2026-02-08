import { useEffect, useId, useState } from "react"
import Empty from "@/components/Empty"
import { Button } from "@/components/ui/button"
import EditableListRow from "@/components/ui/editable-list-row"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
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

type CategoryDialogProps = {
  open: boolean
  input: string
  submitting: boolean
  updatingId: string | null
  categories: BenchmarkCategory[]
  onOpenChange: (open: boolean) => void
  onInputChange: (value: string) => void
  onSubmit: () => void
  onUpdateName: (category: BenchmarkCategory, value: string) => void
  onRequestDelete: (category: BenchmarkCategory) => void
}

type ConfirmDialogsProps = {
  entry: BenchmarkEntry | null
  category: BenchmarkCategory | null
  onEntryCancel: () => void
  onCategoryCancel: () => void
  onEntryConfirm: () => void
  onCategoryConfirm: () => void
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
  categoryDialog: CategoryDialogProps
  confirmDialogs: ConfirmDialogsProps
}

export default function BenchmarkDialogs({
  subtitleDialog,
  addDialog,
  editDialog,
  categoryDialog,
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
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editingCategoryName, setEditingCategoryName] = useState("")

  useEffect(() => {
    if (!categoryDialog.open) {
      setEditingCategoryId(null)
      setEditingCategoryName("")
    }
  }, [categoryDialog.open])

  useEffect(() => {
    if (!editingCategoryId) return
    if (!categoryDialog.categories.some((item) => item.id === editingCategoryId)) {
      setEditingCategoryId(null)
      setEditingCategoryName("")
    }
  }, [categoryDialog.categories, editingCategoryId])

  const handleStartEditCategory = (category: BenchmarkCategory) => {
    setEditingCategoryId(category.id)
    setEditingCategoryName(category.name)
  }

  const handleConfirmEditCategory = (category: BenchmarkCategory) => {
    categoryDialog.onUpdateName(category, editingCategoryName)
    setEditingCategoryId(null)
    setEditingCategoryName("")
  }

  const handleCancelEditCategory = () => {
    setEditingCategoryId(null)
    setEditingCategoryName("")
  }
  return (
    <>
      <Dialog open={subtitleDialog.open} onOpenChange={subtitleDialog.onOpenChange}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>字幕内容</DialogTitle>
            <DialogDescription>自动获取视频字幕，可一键复制。</DialogDescription>
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
              关闭
            </Button>
            <Button
              type="button"
              onClick={subtitleDialog.onCopy}
              disabled={subtitleDialog.loading || !hasSubtitle}
            >
              复制
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialog.open} onOpenChange={addDialog.onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>添加对标视频</DialogTitle>
            <DialogDescription>支持粘贴多个链接或 BV 号，每行一个。</DialogDescription>
          </DialogHeader>
          <FieldSet>
            <Field>
              <FieldLabel htmlFor={addLinksId}>视频链接</FieldLabel>
              <FieldContent>
                <Textarea
                  id={addLinksId} rows={4}
                  value={addDialog.links}
                  onChange={(event) => addDialog.onLinksChange(event.target.value)}
                  placeholder="可粘贴多个B站链接或 BV 号，每行一个"
                />
              </FieldContent>
            </Field>
            <Field orientation="horizontal" className="items-center">
              <FieldLabel className="min-w-[72px]" htmlFor={addCategoryId}>选择分类</FieldLabel>
              <FieldContent>
                <Select value={addDialog.categoryId} onValueChange={addDialog.onCategoryChange}>
                  <SelectTrigger id={addCategoryId} className="w-[200px]">
                    <SelectValue placeholder="请选择" />
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
              <FieldLabel htmlFor={addNoteId}>备注（可选）</FieldLabel>
              <FieldContent>
                <Textarea
                  id={addNoteId} rows={2}
                  value={addDialog.note}
                  onChange={(event) => addDialog.onNoteChange(event.target.value)}
                  placeholder="填写该视频亮点或竞品策略"
                />
              </FieldContent>
            </Field>
          </FieldSet>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => addDialog.onOpenChange(false)}>
              取消
            </Button>
            <Button type="button" onClick={addDialog.onSubmit} disabled={addDialog.submitting}>
              {addDialog.submitting ? "处理中.." : "添加"}
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
            <DialogTitle>编辑对标视频</DialogTitle>
            <DialogDescription>Edit benchmark video.</DialogDescription>
          </DialogHeader>
          <FieldSet>
            <Field>
              <FieldLabel htmlFor={editTitleId}>标题</FieldLabel>
              <FieldContent>
                <Input id={editTitleId} value={editDialog.title} onChange={(event) => editDialog.onTitleChange(event.target.value)} />
              </FieldContent>
            </Field>
            <Field orientation="horizontal" className="items-center">
              <FieldLabel className="min-w-[72px]" htmlFor={editCategoryId}>分类</FieldLabel>
              <FieldContent>
                <Select value={editDialog.categoryId} onValueChange={editDialog.onCategoryChange}>
                  <SelectTrigger id={editCategoryId} className="w-[200px]">
                    <SelectValue placeholder="请选择" />
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
              <FieldLabel htmlFor={editNoteId}>备注</FieldLabel>
              <FieldContent>
                <Textarea
                  id={editNoteId} rows={2}
                  value={editDialog.note}
                  onChange={(event) => editDialog.onNoteChange(event.target.value)}
                />
              </FieldContent>
            </Field>
          </FieldSet>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={editDialog.onClose}>
              取消
            </Button>
            <Button type="button" onClick={editDialog.onSubmit} disabled={editDialog.submitting}>
              {editDialog.submitting ? "保存中.." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryDialog.open} onOpenChange={categoryDialog.onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>分类管理</DialogTitle>
            <DialogDescription>支持空格分隔一次新增多个分类。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Input
                aria-label="Category name" className="min-w-[220px] flex-1"
                value={categoryDialog.input}
                onChange={(event) => categoryDialog.onInputChange(event.target.value)}
                placeholder="例如：键盘 鼠标 耳机"
              />
              <Button type="button" onClick={categoryDialog.onSubmit} disabled={categoryDialog.submitting}>
                {categoryDialog.submitting ? "新增中.." : "新增"}
              </Button>
            </div>

            {categoryDialog.categories.length === 0 ? (
              <Empty title="暂无分类" description="先新增分类再添加对标视频。" />
            ) : (
              <ScrollArea className="dialog-list" data-dialog-scroll="true">
                <div className="space-y-2 pr-2">
                  {categoryDialog.categories.map((category) => {
                    return (
                      <EditableListRow
                        key={category.id}
                        editing={editingCategoryId === category.id}
                        editAriaLabel="Edit benchmark category"
                        deleteAriaLabel="Delete category"
                        onEdit={() => handleStartEditCategory(category)}
                        onDelete={() => categoryDialog.onRequestDelete(category)}
                        onConfirm={() => handleConfirmEditCategory(category)}
                        onCancel={handleCancelEditCategory}
                        viewContent={<div className="modal-list-field">{category.name}</div>}
                        editContent={(
                          <Input
                            aria-label="Category name"
                            className="modal-list-field"
                            value={editingCategoryId === category.id ? editingCategoryName : category.name}
                            onChange={(event) => setEditingCategoryName(event.target.value)}
                            disabled={categoryDialog.updatingId === String(category.id)}
                          />
                        )}
                      />
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => categoryDialog.onOpenChange(false)}
            >
              取消
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
            <AlertDialogTitle>删除对标视频</AlertDialogTitle>
            <AlertDialogDescription>确认删除该对标视频吗？该操作无法撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={confirmDialogs.onEntryCancel}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialogs.onEntryConfirm}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={Boolean(confirmDialogs.category)}
        onOpenChange={(open) => {
          if (!open) confirmDialogs.onCategoryCancel()
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除分类</AlertDialogTitle>
            <AlertDialogDescription>
              删除分类后，该分类下的对标视频也会被移除。确认删除吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={confirmDialogs.onCategoryCancel}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialogs.onCategoryConfirm}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

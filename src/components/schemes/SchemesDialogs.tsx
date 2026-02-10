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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldContent, FieldLabel } from "@/components/ui/field"
import CategoryManagerModal from "@/components/archive/CategoryManagerModal"
import type { CategoryItem } from "@/components/archive/types"

type SchemeFormDialogProps = {
  open: boolean
  mode: "create" | "edit"
  name: string
  categoryId: string
  remark: string
  categories: CategoryItem[]
  onOpenChange: (open: boolean) => void
  onNameChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onRemarkChange: (value: string) => void
  onSubmit: () => void
}

type DeleteDialogProps = {
  open: boolean
  name?: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

type SchemesDialogsProps = {
  categoryManager: {
    open: boolean
    categories: CategoryItem[]
    onClose: () => void
    onSave: (next: CategoryItem[]) => void
  }
  formDialog: SchemeFormDialogProps
  deleteDialog: DeleteDialogProps
}

export default function SchemesDialogs({
  categoryManager,
  formDialog,
  deleteDialog,
}: SchemesDialogsProps) {
  const baseId = useId()
  const nameId = `${baseId}-name`
  const categoryId = `${baseId}-category`
  const remarkId = `${baseId}-remark`
  return (
    <>
      {categoryManager.open ? (
        <CategoryManagerModal
          isOpen={categoryManager.open}
          categories={categoryManager.categories}
          onClose={categoryManager.onClose}
          onSave={categoryManager.onSave}
        />
      ) : null}

      <Dialog open={formDialog.open} onOpenChange={formDialog.onOpenChange}>
        <DialogContent
          className="sm:max-w-[520px]"
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{formDialog.mode === "edit" ? "编辑方案" : "新建方案"}</DialogTitle>
            <DialogDescription>完善方案信息，方便后续管理。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Field orientation="horizontal" className="items-start">
              <FieldLabel className="w-20 pt-2" htmlFor={nameId}>方案名称</FieldLabel>
              <FieldContent className="flex-1">
                <Input
                  id={nameId} value={formDialog.name}
                  onChange={(event) => formDialog.onNameChange(event.target.value)}
                  placeholder="输入方案名称"
                />
              </FieldContent>
            </Field>
            <Field orientation="horizontal" className="items-start">
              <FieldLabel className="w-20 pt-2" htmlFor={categoryId}>所属分类</FieldLabel>
              <FieldContent className="flex-1">
                <Select value={formDialog.categoryId} onValueChange={formDialog.onCategoryChange}>
                  <SelectTrigger id={categoryId}>
                    <SelectValue placeholder="请选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {formDialog.categories
                      .slice()
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </FieldContent>
            </Field>
            <Field orientation="horizontal" className="items-start">
              <FieldLabel className="w-20 pt-2" htmlFor={remarkId}>备注</FieldLabel>
              <FieldContent className="flex-1">
                <Textarea
                  id={remarkId} rows={4}
                  value={formDialog.remark}
                  onChange={(event) => formDialog.onRemarkChange(event.target.value)}
                  placeholder="补充说明、适用场景等"
                />
              </FieldContent>
            </Field>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" type="button" onClick={() => formDialog.onOpenChange(false)}>
              取消
            </Button>
            <Button onClick={formDialog.onSubmit}>保存方案</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={deleteDialog.onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除{deleteDialog.name ? `【${deleteDialog.name}】` : "该项"}吗？该操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => deleteDialog.onOpenChange(false)}>
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={deleteDialog.onConfirm}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

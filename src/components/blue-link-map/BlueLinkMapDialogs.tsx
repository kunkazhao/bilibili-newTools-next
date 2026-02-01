import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import EditableListRow from "@/components/ui/editable-list-row"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type {
  BlueLinkAccount,
  BlueLinkCategory,
  ProgressFailure,
  SourcingItem,
} from "./types"

interface BlueLinkMapDialogsProps {
  editOpen: boolean
  editLink: string
  onEditLinkChange: (value: string) => void
  onEditOpenChange: (open: boolean) => void
  onEditSubmit: () => void

  importOpen: boolean
  importText: string
  importing: boolean
  onImportTextChange: (value: string) => void
  onImportOpenChange: (open: boolean) => void
  onImportSubmit: () => void

  accountModalOpen: boolean
  accountNameInput: string
  accounts: BlueLinkAccount[]
  onAccountNameChange: (value: string) => void
  onAccountSubmit: () => void
  onAccountOpenChange: (open: boolean) => void
  onAccountNameBlur: (accountId: string, value: string) => void
  onAccountDelete: (accountId: string) => void
  onAccountReorder: (sourceId: string, targetId: string) => void

  categoryModalOpen: boolean
  categoryNameInput: string
  categoryError: string
  categories: BlueLinkCategory[]
  activeAccountId: string | null
  onCategoryNameChange: (value: string) => void
  onCategorySubmit: () => void
  onCategoryOpenChange: (open: boolean) => void
  onCategoryNameBlur: (categoryId: string, value: string) => void
  onCategoryAddFromOther: (name: string) => void
  onCategoryDelete: (categoryId: string) => void
  onCategoryReorder: (sourceId: string, targetId: string) => void

  pickerOpen: boolean
  pickerCategoryId: string
  pickerItems: SourcingItem[]
  pickerHasMore: boolean
  pickerLoading: boolean
  onPickerCategoryChange: (value: string) => void
  onPickerOpenChange: (open: boolean) => void
  onPickerPick: (itemId: string) => void
  onPickerLoadMore: () => void

  progressOpen: boolean
  progressLabel: string
  progressTotal: number
  progressProcessed: number
  progressSuccess: number
  progressFailures: ProgressFailure[]
  progressCancelled: boolean
  progressRunning: boolean
  onProgressOpenChange: (open: boolean) => void
  onProgressCancel: () => void
  onProgressClose: () => void

  confirmOpen: boolean
  confirmTitle: string
  confirmDescription: string
  confirmActionLabel: string
  onConfirmOpenChange: (open: boolean) => void
  onConfirmAction: () => void
}

export default function BlueLinkMapDialogs({
  editOpen,
  editLink,
  onEditLinkChange,
  onEditOpenChange,
  onEditSubmit,
  importOpen,
  importText,
  importing,
  onImportTextChange,
  onImportOpenChange,
  onImportSubmit,
  accountModalOpen,
  accountNameInput,
  accounts,
  onAccountNameChange,
  onAccountSubmit,
  onAccountOpenChange,
  onAccountNameBlur,
  onAccountDelete,
  onAccountReorder,
  categoryModalOpen,
  categoryNameInput,
  categoryError,
  categories,
  activeAccountId,
  onCategoryNameChange,
  onCategorySubmit,
  onCategoryOpenChange,
  onCategoryNameBlur,
  onCategoryAddFromOther,
  onCategoryDelete,
  onCategoryReorder,
  pickerOpen,
  pickerCategoryId,
  pickerItems,
  pickerHasMore,
  pickerLoading,
  onPickerCategoryChange,
  onPickerOpenChange,
  onPickerPick,
  onPickerLoadMore,
  progressOpen,
  progressLabel,
  progressTotal,
  progressProcessed,
  progressSuccess,
  progressFailures,
  progressCancelled,
  progressRunning,
  onProgressOpenChange,
  onProgressCancel,
  onProgressClose,
  confirmOpen,
  confirmTitle,
  confirmDescription,
  confirmActionLabel,
  onConfirmOpenChange,
  onConfirmAction,
}: BlueLinkMapDialogsProps) {
  const normalizeName = (value?: string) => String(value || "").trim()
  const [accountDragId, setAccountDragId] = useState<string | null>(null)
  const [categoryDragId, setCategoryDragId] = useState<string | null>(null)

  const handleAccountDrop = (targetId: string) => {
    if (!accountDragId || accountDragId === targetId) return
    onAccountReorder(accountDragId, targetId)
    setAccountDragId(null)
  }

  const handleCategoryDrop = (targetId: string) => {
    if (!categoryDragId || categoryDragId === targetId) return
    onCategoryReorder(categoryDragId, targetId)
    setCategoryDragId(null)
  }
  const currentCategories = activeAccountId
    ? categories.filter((category) => category.account_id === activeAccountId)
    : []
  const currentCategoryNames = new Set(currentCategories.map((category) => normalizeName(category.name)))
  const otherCategories = activeAccountId
    ? categories.filter(
        (category) =>
          category.account_id !== activeAccountId &&
          !currentCategoryNames.has(normalizeName(category.name))
      )
    : []
  const pickerCategories = activeAccountId
    ? categories.filter((category) => category.account_id === activeAccountId)
    : []

  return (
    <>
      <Dialog open={editOpen} onOpenChange={onEditOpenChange}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>编辑蓝链</DialogTitle>
            <DialogDescription>修改蓝链链接并重新匹配商品。</DialogDescription>
          </DialogHeader>
          <Textarea aria-label="Edit blue link"
            rows={4}
            value={editLink}
            onChange={(event) => onEditLinkChange(event.target.value)}
            placeholder="请输入蓝链"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onEditOpenChange(false)}>
              取消
            </Button>
            <Button onClick={onEditSubmit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={onImportOpenChange}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>导入蓝链</DialogTitle>
            <DialogDescription>每行一条蓝链，系统会自动匹配商品。</DialogDescription>
          </DialogHeader>
          <Textarea aria-label="Import links"
            rows={6}
            value={importText}
            onChange={(event) => onImportTextChange(event.target.value)}
            placeholder="https://b23.tv/..."
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onImportOpenChange(false)}>
              取消
            </Button>
            <Button onClick={onImportSubmit} disabled={importing}>
              {importing ? "导入中..." : "开始导入"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accountModalOpen} onOpenChange={onAccountOpenChange}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>账号管理</DialogTitle>
            <DialogDescription>新增、编辑或删除账号。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                aria-label="Account name" placeholder="账号名称"
                value={accountNameInput}
                onChange={(event) => onAccountNameChange(event.target.value)}
              />
              <Button onClick={onAccountSubmit}>新增</Button>
            </div>
            <ScrollArea className="dialog-list" data-dialog-scroll="true">
              <div className="space-y-2 pr-2">
                {accounts.map((account) => (
                  <EditableListRow
                    key={account.id}
                    value={account.name}
                    inputKey={`${account.id}-${account.name}`}
                    draggable
                    dragHandleAriaLabel="Drag handle"
                    onDragStart={() => setAccountDragId(account.id)}
                    onDragEnd={() => setAccountDragId(null)}
                    onDrop={() => handleAccountDrop(account.id)}
                    onBlur={(value) => onAccountNameBlur(account.id, value)}
                    actionContent={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                    actionAriaLabel="Delete account"
                    actionSize="icon"
                    actionClassName="dialog-action-delete"
                    onAction={() => onAccountDelete(account.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onAccountOpenChange(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={categoryModalOpen} onOpenChange={onCategoryOpenChange}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>分类管理</DialogTitle>
            <DialogDescription>管理当前账号下的蓝链分类。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                aria-label="Category name" placeholder="分类名称"
                value={categoryNameInput}
                onChange={(event) => onCategoryNameChange(event.target.value)}
                disabled={!activeAccountId}
              />
              <Button
                onClick={onCategorySubmit}
                disabled={!activeAccountId}
              >
                新增
              </Button>
            </div>
            {categoryError ? <p className="text-xs text-rose-500">{categoryError}</p> : null}
            {!activeAccountId ? (
              <p className="text-xs text-slate-400">请先选择账号。</p>
            ) : (
              <ScrollArea className="dialog-list" data-dialog-scroll="true">
                <div className="space-y-2 pr-2">
                  {currentCategories.map((category) => (
                    <EditableListRow
                      key={category.id}
                      value={category.name}
                      inputKey={`${category.id}-${category.name}`}
                      draggable
                      dragHandleAriaLabel="Drag handle"
                      onDragStart={() => setCategoryDragId(category.id)}
                      onDragEnd={() => setCategoryDragId(null)}
                      onDrop={() => handleCategoryDrop(category.id)}
                      onBlur={(value) => onCategoryNameBlur(category.id, value)}
                      actionContent={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                      actionAriaLabel="Delete category"
                      actionSize="icon"
                      actionClassName="dialog-action-delete"
                      onAction={() => onCategoryDelete(category.id)}
                    />
                  ))}
                  {otherCategories.map((category) => (
                    <EditableListRow
                      key={`other-${category.id}`}
                      value={category.name}
                      readOnly
                      actionLabel="添加"
                      actionAriaLabel="Add category"
                      onAction={() => onCategoryAddFromOther(category.name)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onCategoryOpenChange(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={pickerOpen} onOpenChange={onPickerOpenChange}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>选择商品</DialogTitle>
            <DialogDescription>选择商品用于映射蓝链。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={pickerCategoryId}
                onValueChange={onPickerCategoryChange}
                disabled={pickerCategories.length === 0}
              >
                <SelectTrigger aria-label="Category filter" className="w-[200px]">
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {pickerCategories.map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="max-h-[360px] space-y-2 overflow-auto rounded-xl border border-slate-200 p-3">
              {pickerItems.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">
                  {pickerLoading ? "加载中..." : "暂无商品"}
                </div>
              ) : (
                pickerItems.map((item) => (
                  <button
                    key={item.id}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    type="button"
                    onClick={() => onPickerPick(item.id)}
                  >
                    <span>{item.title || "未命名商品"}</span>
                    <span className="text-xs text-slate-400">{item.price ?? "--"} 元</span>
                  </button>
                ))
              )}
              {pickerHasMore ? (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={onPickerLoadMore}
                  disabled={pickerLoading}
                >
                  {pickerLoading ? "加载中..." : "加载更多"}
                </Button>
              ) : null}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onPickerOpenChange(false)}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={progressOpen} onOpenChange={onProgressOpenChange}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{progressLabel}进度</DialogTitle>
            <DialogDescription>
              {progressRunning
                ? `${progressLabel}中... 已处理 ${progressProcessed} / ${progressTotal}`
                : progressCancelled
                ? `${progressLabel}已取消`
                : `${progressLabel}完成`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-brand transition-all"
                style={{ width: progressTotal ? `${(progressProcessed / progressTotal) * 100}%` : "0%" }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-500">
              <div>总数 {progressTotal}</div>
              <div>成功 {progressSuccess}</div>
              <div>失败 {progressFailures.length}</div>
            </div>
            <div className="max-h-[200px] space-y-2 overflow-auto text-xs text-slate-600">
              {progressFailures.length === 0 ? (
                <div className="text-slate-400">暂无失败记录</div>
              ) : (
                progressFailures.map((item, index) => (
                  <div key={`${item.link}-${index}`} className="rounded-lg border border-slate-200 p-2">
                    <div className="text-rose-500">[{item.reason}]</div>
                    <div>{item.name}</div>
                    <div className="break-all text-slate-400">{item.link}</div>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            {progressRunning ? (
              <Button variant="outline" onClick={onProgressCancel}>
                取消
              </Button>
            ) : (
              <Button variant="outline" onClick={onProgressClose}>
                关闭
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={onConfirmOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            {confirmDescription ? (
              <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmAction}>{confirmActionLabel}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

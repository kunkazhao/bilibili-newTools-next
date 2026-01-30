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

type ArchiveDialogsProps = {
  clearOpen: boolean
  itemCount: number
  isClearing: boolean
  onClearOpenChange: (open: boolean) => void
  onConfirmClear: () => void
}

export default function ArchiveDialogs({
  clearOpen,
  itemCount,
  isClearing,
  onClearOpenChange,
  onConfirmClear,
}: ArchiveDialogsProps) {
  return (
    <AlertDialog open={clearOpen} onOpenChange={onClearOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>清空列表</AlertDialogTitle>
          <AlertDialogDescription>
            确认清空当前筛选条件下的 {itemCount} 个商品吗？该操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onClearOpenChange(false)}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmClear} disabled={isClearing}>
            {isClearing ? "清空中..." : "确认清空"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

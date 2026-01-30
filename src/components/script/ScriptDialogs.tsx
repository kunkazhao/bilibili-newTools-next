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

type ScriptDialogsProps = {
  clearOpen: boolean
  onClearOpenChange: (open: boolean) => void
  onConfirmClear: () => void
}

export default function ScriptDialogs({
  clearOpen,
  onClearOpenChange,
  onConfirmClear,
}: ScriptDialogsProps) {
  return (
    <AlertDialog open={clearOpen} onOpenChange={onClearOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除文案</AlertDialogTitle>
          <AlertDialogDescription>
            确认删除当前已保存的文案吗？该操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onClearOpenChange(false)}>
            取消
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmClear}>
            确认删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

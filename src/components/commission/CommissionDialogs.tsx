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
import CommissionArchiveModal from "@/components/commission/CommissionArchiveModal"

type ArchiveCategory = {
  id: string
  name: string
  sortOrder: number
}

type CommissionDialogsProps = {
  clearOpen: boolean
  onClearOpenChange: (open: boolean) => void
  onConfirmClear: () => void
  archiveOpen: boolean
  categories: ArchiveCategory[]
  selectedCategoryId: string
  itemCount: number
  isSubmitting: boolean
  isLoading: boolean
  onCategoryChange: (value: string) => void
  onConfirmArchive: () => void
  onCloseArchive: () => void
}

export default function CommissionDialogs({
  clearOpen,
  onClearOpenChange,
  onConfirmClear,
  archiveOpen,
  categories,
  selectedCategoryId,
  itemCount,
  isSubmitting,
  isLoading,
  onCategoryChange,
  onConfirmArchive,
  onCloseArchive,
}: CommissionDialogsProps) {
  return (
    <>
      <AlertDialog open={clearOpen} onOpenChange={onClearOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清空列表？</AlertDialogTitle>
            <AlertDialogDescription>
              清空后将移除当前列表的全部商品。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmClear}>确认清空</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CommissionArchiveModal
        isOpen={archiveOpen}
        categories={categories}
        selectedCategoryId={selectedCategoryId}
        itemCount={itemCount}
        isSubmitting={isSubmitting}
        isLoading={isLoading}
        onCategoryChange={onCategoryChange}
        onConfirm={onConfirmArchive}
        onClose={onCloseArchive}
      />
    </>
  )
}

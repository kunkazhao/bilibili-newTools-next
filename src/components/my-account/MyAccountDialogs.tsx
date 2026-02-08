import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import EditableListRow from "@/components/ui/editable-list-row"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Account } from "@/types/account"

interface MyAccountDialogsProps {
  accountModalOpen: boolean
  accountNameInput: string
  accountLinkInput: string
  accounts: Account[]
  onAccountNameChange: (value: string) => void
  onAccountLinkChange: (value: string) => void
  onAccountSubmit: () => void
  onAccountOpenChange: (open: boolean) => void
  onAccountNameBlur: (accountId: string, value: string) => void
  onAccountLinkBlur: (accountId: string, value: string) => void
  onAccountDelete: (accountId: string) => void
}

export default function MyAccountDialogs({
  accountModalOpen,
  accountNameInput,
  accountLinkInput,
  accounts,
  onAccountNameChange,
  onAccountLinkChange,
  onAccountSubmit,
  onAccountOpenChange,
  onAccountNameBlur,
  onAccountLinkBlur,
  onAccountDelete,
}: MyAccountDialogsProps) {
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [editingAccountName, setEditingAccountName] = useState("")
  const [editingAccountLink, setEditingAccountLink] = useState("")

  useEffect(() => {
    if (!accountModalOpen) {
      setEditingAccountId(null)
      setEditingAccountName("")
      setEditingAccountLink("")
    }
  }, [accountModalOpen])

  const handleStartEdit = (account: Account) => {
    setEditingAccountId(account.id)
    setEditingAccountName(account.name)
    setEditingAccountLink(account.homepage_link ?? "")
  }

  const handleConfirmEdit = (account: Account) => {
    onAccountNameBlur(account.id, editingAccountName)
    onAccountLinkBlur(account.id, editingAccountLink)
    setEditingAccountId(null)
    setEditingAccountName("")
    setEditingAccountLink("")
  }

  const handleCancelEdit = () => {
    setEditingAccountId(null)
    setEditingAccountName("")
    setEditingAccountLink("")
  }

  return (
    <Dialog open={accountModalOpen} onOpenChange={onAccountOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>账号管理</DialogTitle>
          <DialogDescription>新增、编辑或删除账号。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-1 items-center gap-2">
              <Input
                aria-label="Account name"
                className="modal-list-field"
                placeholder="账号名称"
                value={accountNameInput}
                onChange={(event) => onAccountNameChange(event.target.value)}
              />
              <Input
                aria-label="Homepage link"
                className="modal-list-field"
                placeholder="个人主页链接（https://space.bilibili.com/xxx）"
                value={accountLinkInput}
                onChange={(event) => onAccountLinkChange(event.target.value)}
              />
              <Button onClick={onAccountSubmit}>新增</Button>
            </div>
          </div>
          <ScrollArea className="dialog-list" data-dialog-scroll="true">
            <div className="space-y-2 pr-2">
              {accounts.map((account) => (
                <EditableListRow
                  key={account.id}
                  editing={editingAccountId === account.id}
                  editAriaLabel="Edit account"
                  deleteAriaLabel="Delete account"
                  onEdit={() => handleStartEdit(account)}
                  onDelete={() => onAccountDelete(account.id)}
                  onConfirm={() => handleConfirmEdit(account)}
                  onCancel={handleCancelEdit}
                  viewContent={(
                    <div className="flex items-center gap-2">
                      <div className="modal-list-field flex-1">{account.name}</div>
                      <div className="modal-list-field flex-1">
                        {account.homepage_link ?? ""}
                      </div>
                    </div>
                  )}
                  editContent={(
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label="Account name"
                        className="modal-list-field flex-1"
                        value={editingAccountId === account.id ? editingAccountName : account.name}
                        onChange={(event) => setEditingAccountName(event.target.value)}
                      />
                      <Input
                        aria-label="Homepage link"
                        className="modal-list-field flex-1"
                        placeholder="个人主页链接"
                        value={editingAccountId === account.id ? editingAccountLink : account.homepage_link ?? ""}
                        onChange={(event) => setEditingAccountLink(event.target.value)}
                      />
                    </div>
                  )}
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
  )
}

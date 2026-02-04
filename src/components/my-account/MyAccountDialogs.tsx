import { Button } from "@/components/ui/button"
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
import { Trash2 } from "lucide-react"
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
                <div key={account.id} className="modal-list-row">
                  <Input
                    key={`${account.id}-name-${account.name}`}
                    aria-label="Account name"
                    className="modal-list-field"
                    defaultValue={account.name}
                    onBlur={(event) =>
                      onAccountNameBlur(account.id, event.target.value)
                    }
                  />
                  <Input
                    key={`${account.id}-link-${account.homepage_link ?? ""}`}
                    aria-label="Homepage link"
                    className="modal-list-field"
                    placeholder="个人主页链接"
                    defaultValue={account.homepage_link ?? ""}
                    onBlur={(event) =>
                      onAccountLinkBlur(account.id, event.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="dialog-action-delete"
                    aria-label="Delete account"
                    onClick={() => onAccountDelete(account.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
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

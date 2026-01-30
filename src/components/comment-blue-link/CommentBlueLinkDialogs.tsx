import { Button } from "@/components/ui/button"
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
import type { CommentAccount, CommentCategory } from "./types"

interface CommentBlueLinkDialogsProps {
  modalOpen: boolean
  editing: boolean
  accounts: CommentAccount[]
  categories: CommentCategory[]
  formAccountId: string
  formCategoryId: string
  formName: string
  formSourceLink: string
  formContent: string
  formRemark: string
  extracting: boolean
  onModalOpenChange: (open: boolean) => void
  onAccountChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onNameChange: (value: string) => void
  onSourceLinkChange: (value: string) => void
  onContentChange: (value: string) => void
  onRemarkChange: (value: string) => void
  onExtract: () => void
  onSave: () => void
}

export default function CommentBlueLinkDialogs({
  modalOpen,
  editing,
  accounts,
  categories,
  formAccountId,
  formCategoryId,
  formName,
  formSourceLink,
  formContent,
  formRemark,
  extracting,
  onModalOpenChange,
  onAccountChange,
  onCategoryChange,
  onNameChange,
  onSourceLinkChange,
  onContentChange,
  onRemarkChange,
  onExtract,
  onSave,
}: CommentBlueLinkDialogsProps) {
  return (
    <Dialog open={modalOpen} onOpenChange={onModalOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑蓝链组合" : "新增蓝链组合"}</DialogTitle>
          <DialogDescription>{"\u7528\u4e8e\u8bc4\u8bba\u533a\u84dd\u94fe\u8bc4\u8bba"}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">账号</label>
            <Select value={formAccountId} onValueChange={onAccountChange} disabled={editing}>
              <SelectTrigger aria-label="Select account">
                <SelectValue placeholder="选择账号" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">分类</label>
            <Select value={formCategoryId} onValueChange={onCategoryChange} disabled={editing}>
              <SelectTrigger aria-label="Select category">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((item) => item.account_id === formAccountId)
                  .map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">组合名称</label>
            <Input
              aria-label="Group name"
              placeholder="组合名称"
              value={formName}
              onChange={(event) => onNameChange(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-600">来源链接</label>
            <div className="flex items-center gap-2">
              <Input
                aria-label="Source link"
                placeholder="来源链接"
                value={formSourceLink}
                onChange={(event) => onSourceLinkChange(event.target.value)}
              />
              <Button variant="outline" onClick={onExtract} disabled={extracting}>
                {extracting ? "\u63d0\u53d6\u4e2d..." : "\u4e00\u952e\u63d0\u53d6"}
              </Button>
            </div>
            <p className="text-xs text-slate-400">支持B站链接/BV号，提取置顶评论内容</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">评论内容</label>
            <Textarea
              aria-label="Comment content"
              rows={5}
              placeholder="评论内容"
              value={formContent}
              onChange={(event) => onContentChange(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">备注</label>
            <Input
              aria-label="Remark"
              placeholder="备注"
              value={formRemark}
              onChange={(event) => onRemarkChange(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onModalOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onSave}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
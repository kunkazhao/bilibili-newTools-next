import { useId } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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

type CopywritingProps = {
  title: string
  intro: string
  vote: string
  onTitleChange: (value: string) => void
  onIntroChange: (value: string) => void
  onVoteChange: (value: string) => void
  onOpenPrompt: (type: "title" | "intro" | "vote") => void
  onCopy: (text: string, message: string) => void
  onGenerate: (type: "title" | "intro" | "vote") => void
}

type CommentReplyProps = {
  count: number
  prompt: string
  output: string
  onCountChange: (value: number) => void
  onPromptChange: (value: string) => void
  onOutputChange: (value: string) => void
  onOpenPrompt: () => void
  onCopy: (text: string, message: string) => void
  onGenerate: () => void
}

type BlueLinkAccount = { id: string; name: string }
type BlueRange = { min: number | null; max: number | null }
type BlueLinkGroup = { label: string; lines: string[] }

type BlueLinkProps = {
  accounts: BlueLinkAccount[]
  selectedAccountIds: Set<string>
  ranges: BlueRange[]
  groups: BlueLinkGroup[]
  missingMessage: string
  onToggleAccount: (id: string, checked: boolean) => void
  onRangeChange: (index: number, field: "min" | "max", value: number | null) => void
  onAddRange: () => void
  onRemoveRange: (index: number) => void
  onCopyAll: () => void
  onCopyGroup: (lines: string[]) => void
  onGenerate: () => void
}

type ImageTemplate = { id: string; name?: string | null; category?: string | null }
type ImageStatus = { type: "success" | "error" | "info"; message: string }

type ImagePanelProps = {
  categories: string[]
  templates: ImageTemplate[]
  activeCategory: string
  activeTemplateId: string
  emptyValue: string
  missingMessage: string
  status: ImageStatus | null
  onCategoryChange: (value: string) => void
  onTemplateChange: (value: string) => void
  onRefreshMissing: () => void
  onGenerate: () => void
}

type ExportProps = {
  onExport: () => void
  onDownloadImages: () => void
  onOpenFeishu: () => void
}

type SchemeDetailSidebarProps = {
  copywriting: CopywritingProps
  commentReply: CommentReplyProps
  blueLink: BlueLinkProps
  image: ImagePanelProps
  exportSync: ExportProps
}

export default function SchemeDetailSidebar({
  copywriting,
  commentReply,
  blueLink,
  image,
  exportSync,
}: SchemeDetailSidebarProps) {
  const countId = useId()
  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-base font-semibold text-slate-900">文案生成</h3>
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">标题</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => copywriting.onOpenPrompt("title")}>
                  编辑提示词
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copywriting.onCopy(copywriting.title, "标题已复制")}
                >
                  复制
                </Button>
                <Button size="sm" onClick={() => copywriting.onGenerate("title")}>
                  生成
                </Button>
              </div>
            </div>
            <Textarea
              aria-label="Copywriting title" rows={4}
              value={copywriting.title}
              onChange={(event) => copywriting.onTitleChange(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">简介</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => copywriting.onOpenPrompt("intro")}>
                  编辑提示词
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copywriting.onCopy(copywriting.intro, "简介已复制")}
                >
                  复制
                </Button>
                <Button size="sm" onClick={() => copywriting.onGenerate("intro")}>
                  生成
                </Button>
              </div>
            </div>
            <Textarea
              aria-label="Copywriting intro" rows={4}
              value={copywriting.intro}
              onChange={(event) => copywriting.onIntroChange(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">投票文案</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => copywriting.onOpenPrompt("vote")}>
                  编辑提示词
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copywriting.onCopy(copywriting.vote, "投票文案已复制")}
                >
                  复制
                </Button>
                <Button size="sm" onClick={() => copywriting.onGenerate("vote")}>
                  生成
                </Button>
              </div>
            </div>
            <Textarea
              aria-label="Copywriting vote" rows={4}
              value={copywriting.vote}
              onChange={(event) => copywriting.onVoteChange(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-base font-semibold text-slate-900">评论回复生成</h3>
        <div className="mt-4 space-y-3">
          <Field orientation="horizontal" className="items-center gap-2">
            <FieldLabel className="w-16" htmlFor={countId}>回复数量</FieldLabel>
            <FieldContent className="flex items-center gap-2">
              <Input
                id={countId} aria-label="Reply count" className="w-20"
                type="number"
                min={1}
                max={20}
                value={commentReply.count}
                onChange={(event) => commentReply.onCountChange(Number(event.target.value))}
              />
              <Button variant="ghost" size="sm" onClick={commentReply.onOpenPrompt}>
                编辑提示词
              </Button>
            </FieldContent>
          </Field>
          <Textarea
            aria-label="Comment prompt" rows={3}
            placeholder="补充要求（可选）"
            value={commentReply.prompt}
            onChange={(event) => commentReply.onPromptChange(event.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => commentReply.onCopy(commentReply.output, "评论回复已复制")}
            >
              复制
            </Button>
            <Button size="sm" onClick={commentReply.onGenerate}>
              生成
            </Button>
          </div>
          <Textarea
            aria-label="Comment output" rows={5}
            value={commentReply.output}
            onChange={(event) => commentReply.onOutputChange(event.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-base font-semibold text-slate-900">蓝链生成</h3>
        <div className="mt-4 space-y-3">
          <div className="space-y-2">
            <p className="text-xs text-slate-500">选择账号</p>
            {blueLink.accounts.length === 0 ? (
              <p className="text-xs text-slate-400">暂无账号</p>
            ) : (
              <div className="space-y-2">
                {blueLink.accounts.map((account) => (
                  <label key={account.id} className="flex items-center gap-2 text-sm text-slate-600">
                    <Checkbox
                      aria-label={account.name}
                      checked={blueLink.selectedAccountIds.has(account.id)}
                      onCheckedChange={(value) => blueLink.onToggleAccount(account.id, Boolean(value))}
                    />
                    <span>{account.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500">价格区间</p>
            <div className="space-y-2">
              {blueLink.ranges.map((range, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    aria-label="Min price" type="number"
                    className="w-20"
                    placeholder="最低"
                    value={range.min ?? ""}
                    onChange={(event) => {
                      const value = event.target.value.trim()
                      blueLink.onRangeChange(index, "min", value === "" ? null : Number(value))
                    }}
                  />
                  <span className="text-slate-400">-</span>
                  <Input
                    aria-label="Max price" type="number"
                    className="w-20"
                    placeholder="最高"
                    value={range.max ?? ""}
                    onChange={(event) => {
                      const value = event.target.value.trim()
                      blueLink.onRangeChange(index, "max", value === "" ? null : Number(value))
                    }}
                  />
                  <Button variant="ghost" size="sm" onClick={() => blueLink.onRemoveRange(index)}>
                    删除
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={blueLink.onAddRange}>
              添加区间
            </Button>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={blueLink.onCopyAll}>
              复制全部
            </Button>
            <Button size="sm" onClick={blueLink.onGenerate}>
              生成蓝链
            </Button>
          </div>
          {blueLink.missingMessage ? (
            <p className="text-xs text-rose-500">{blueLink.missingMessage}</p>
          ) : null}
          <div className="space-y-2">
            {blueLink.groups.length === 0 ? (
              <p className="text-xs text-slate-400">暂无蓝链可生成</p>
            ) : (
              blueLink.groups.map((group, index) => (
                <div
                  key={`${group.label}-${index}`}
                  className="rounded-xl border border-slate-200 p-3 text-xs text-slate-600"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{group.label}</span>
                    <Button variant="ghost" size="sm" onClick={() => blueLink.onCopyGroup(group.lines)}>
                      复制
                    </Button>
                  </div>
                  <div className="mt-2 whitespace-pre-line">{group.lines.join("\n")}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-base font-semibold text-slate-900">图片生成</h3>
        <div className="mt-4 space-y-3">
          <Select
            value={image.activeCategory || image.emptyValue}
            onValueChange={(value) =>
              image.onCategoryChange(value === image.emptyValue ? "" : value)
            }
          >
            <SelectTrigger aria-label="Image category">
              <SelectValue placeholder="选择模板分类" />
            </SelectTrigger>
            <SelectContent>
              {image.categories.length === 0 ? (
                <SelectItem value={image.emptyValue}>暂无模板</SelectItem>
              ) : (
                image.categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Select value={image.activeTemplateId} onValueChange={image.onTemplateChange}>
            <SelectTrigger aria-label="Image template">
              <SelectValue placeholder="选择模板" />
            </SelectTrigger>
            <SelectContent>
              {image.templates
                .filter((item) => (item.category || "默认模板") === image.activeCategory)
                .map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name || "未命名模板"}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <div className="text-xs text-slate-500">{image.missingMessage || "缺失字段：暂无"}</div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={image.onRefreshMissing}>
              检查缺失
            </Button>
            <Button size="sm" onClick={image.onGenerate}>
              生成图片
            </Button>
          </div>
          {image.status ? (
            <p
              className={`text-xs ${
                image.status.type === "error"
                  ? "text-rose-500"
                  : image.status.type === "success"
                    ? "text-emerald-600"
                    : "text-slate-500"
              }`}
            >
              {image.status.message}
            </p>
          ) : null}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        <h3 className="text-base font-semibold text-slate-900">导出与同步</h3>
        <div className="mt-4 flex flex-col gap-2">
          <Button variant="outline" onClick={exportSync.onExport}>
            导出表格
          </Button>
          <Button variant="outline" onClick={exportSync.onDownloadImages}>
            下载主图
          </Button>
          <Button onClick={exportSync.onOpenFeishu}>写入飞书表格</Button>
        </div>
      </div>
    </aside>
  )
}

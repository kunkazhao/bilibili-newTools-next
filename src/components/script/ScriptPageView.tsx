import { useId } from "react"
import Empty from "@/components/Empty"
import PrimaryButton from "@/components/PrimaryButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldContent, FieldDescription, FieldLabel, FieldSet, FieldTitle } from "@/components/ui/field"

type ScriptPageViewProps = {
  url: string
  loading: boolean
  hasSubtitle: boolean
  title: string
  author: string
  subtitleText: string
  onUrlChange: (value: string) => void
  onSubmit: () => void
  onDownloadTxt: () => void
  onExportDocx: () => void
  onRequestClear: () => void
}

export default function ScriptPageView({
  url,
  loading,
  hasSubtitle,
  title,
  author,
  subtitleText,
  onUrlChange,
  onSubmit,
  onDownloadTxt,
  onExportDocx,
  onRequestClear,
}: ScriptPageViewProps) {
  const urlId = useId()
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">提取视频文案</h2>
            <p className="mt-1 text-sm text-slate-500">
              输入 B 站视频链接，获取字幕并导出为 TXT 或 DOCX。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton onClick={onSubmit} disabled={loading}>
              {loading ? "获取中..." : "获取字幕"}
            </PrimaryButton>
            <PrimaryButton onClick={onDownloadTxt} disabled={!hasSubtitle}>
              下载字幕 TXT
            </PrimaryButton>
            <PrimaryButton onClick={onExportDocx} disabled={!hasSubtitle}>
              导出 DOCX
            </PrimaryButton>
            <Button
              variant="ghost"
              className="text-rose-500 hover:text-rose-600"
              onClick={onRequestClear}
              disabled={!hasSubtitle}
            >
              删除文案
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <FieldSet>
          <Field>
            <FieldLabel htmlFor={urlId}>视频链接</FieldLabel>
            <FieldContent>
              <div className="flex flex-wrap gap-3">
                <Input
                  id={urlId} value={url}
                  onChange={(event) => onUrlChange(event.target.value)}
                  placeholder="请输入 B 站视频链接或 BV 号"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      onSubmit()
                    }
                  }}
                />
                <Button type="button" onClick={onSubmit} disabled={loading}>
                  {loading ? "获取中..." : "获取字幕"}
                </Button>
              </div>
            </FieldContent>
            <FieldDescription>
              支持 bilibili.com、b23.tv、BV 号或 av 号。
            </FieldDescription>
          </Field>
        </FieldSet>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        {hasSubtitle ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <FieldSet>
                <Field orientation="horizontal" className="items-center">
                  <FieldLabel className="min-w-[64px]">标题</FieldLabel>
                  <FieldContent>
                    <span className="text-sm text-slate-700">{title}</span>
                  </FieldContent>
                </Field>
                <Field orientation="horizontal" className="items-center">
                  <FieldLabel className="min-w-[64px]">作者</FieldLabel>
                  <FieldContent>
                    <span className="text-sm text-slate-700">{author}</span>
                  </FieldContent>
                </Field>
              </FieldSet>
            </div>

            <FieldTitle>原始字幕</FieldTitle>
            <Textarea aria-label="Subtitle text" value={subtitleText} readOnly rows={14} />
          </div>
        ) : (
          <Empty title="暂无字幕内容" description="输入视频链接并获取字幕后显示结果。" />
        )}
      </section>
    </div>
  )
}

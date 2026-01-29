import { useEffect, useMemo, useState } from "react"
import Empty from "@/components/Empty"
import PrimaryButton from "@/components/PrimaryButton"
import { useToast } from "@/components/Toast"
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { apiRequest } from "@/lib/api"

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? ""
const SUBTITLE_STORAGE_KEY = "script_subtitle_data"

type SubtitlePayload =
  | string
  | { body?: { content?: string; text?: string; line?: string }[] }
  | { content?: string; text?: string; line?: string }[]

type VideoInfo = {
  status: string
  title?: string
  author?: string
  owner?: { name?: string }
}

const isValidBilibiliUrl = (url: string) => {
  return /bilibili\.com\/video|b23\.tv|^BV[a-zA-Z0-9]+|^av\d+/i.test(url)
}

const formatSubtitleText = (data: SubtitlePayload) => {
  if (!data) return ""
  if (typeof data === "string") return data.trim()
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data.body)
      ? data.body
      : []
  const lines: string[] = []
  list.forEach((item) => {
    if (!item) return
    const text = item.content || item.text || item.line || ""
    if (text) lines.push(text)
  })
  return lines.join("\n").trim()
}

const sanitizeFilename = (value: string) => {
  return value.replace(/[\\/:*?"<>|]/g, "").trim()
}

export default function ScriptPage() {
  const { showToast } = useToast()
  const [url, setUrl] = useState("")
  const [subtitleRaw, setSubtitleRaw] = useState<SubtitlePayload | null>(null)
  const [subtitleText, setSubtitleText] = useState("")
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [clearOpen, setClearOpen] = useState(false)

  const hasSubtitle = subtitleText.trim().length > 0

  const title = videoInfo?.title?.trim() || "--"
  const author = videoInfo?.author?.trim() || videoInfo?.owner?.name?.trim() || "--"

  const downloadFilename = useMemo(() => {
    const safeAuthor = sanitizeFilename(author || "作者") || "作者"
    return `${safeAuthor}-文案`
  }, [author])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SUBTITLE_STORAGE_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as { subtitle?: SubtitlePayload; videoInfo?: VideoInfo }
      if (data?.subtitle) {
        setSubtitleRaw(data.subtitle)
        setSubtitleText(formatSubtitleText(data.subtitle))
        setVideoInfo(data.videoInfo || null)
      }
    } catch {
      // ignore restore errors
    }
  }, [])

  const saveSubtitleCache = (subtitle: SubtitlePayload, info: VideoInfo | null) => {
    try {
      localStorage.setItem(
        SUBTITLE_STORAGE_KEY,
        JSON.stringify({ subtitle, videoInfo: info })
      )
    } catch {
      // ignore storage errors
    }
  }

  const fetchSubtitle = async (inputUrl: string) => {
    const formData = new FormData()
    formData.append("url", inputUrl)
    const response = await fetch(`${API_BASE}/api/video/subtitle`, {
      method: "POST",
      body: formData,
    })
    if (!response.ok) {
      let detail = "获取字幕失败"
      try {
        const error = await response.json()
        detail = error.detail || detail
      } catch {
        // ignore
      }
      throw new Error(detail)
    }
    const data = await response.json()
    return data.subtitle as SubtitlePayload
  }

  const fetchVideoInfo = async (inputUrl: string) => {
    const data = await apiRequest<VideoInfo>("/api/bilibili/video-info", {
      method: "POST",
      body: JSON.stringify({ url: inputUrl }),
    })
    if (data.status !== "success") {
      throw new Error("视频信息获取失败")
    }
    return data
  }

  const handleGetSubtitle = async () => {
    const trimmed = url.trim()
    if (!trimmed) {
      showToast("请输入视频链接", "error")
      return
    }
    if (!isValidBilibiliUrl(trimmed)) {
      showToast("请输入有效的 B 站视频链接", "error")
      return
    }
    setLoading(true)
    showToast("正在获取字幕...", "info")
    try {
      const [subtitleData, info] = await Promise.all([
        fetchSubtitle(trimmed),
        fetchVideoInfo(trimmed),
      ])
      const text = formatSubtitleText(subtitleData)
      if (!text) {
        throw new Error("字幕内容为空")
      }
      setSubtitleRaw(subtitleData)
      setSubtitleText(text)
      setVideoInfo(info)
      saveSubtitleCache(subtitleData, info)
      showToast("字幕获取完成，可下载 TXT", "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "获取失败"
      showToast(`获取失败: ${message}`, "error")
    } finally {
      setLoading(false)
    }
  }

  const downloadTxt = () => {
    if (!subtitleRaw) {
      showToast("暂无可下载的字幕", "error")
      return
    }
    if (!subtitleText.trim()) {
      showToast("字幕内容为空", "error")
      return
    }
    const blob = new Blob([subtitleText], { type: "text/plain;charset=utf-8" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${downloadFilename}.txt`
    link.click()
    URL.revokeObjectURL(link.href)
    showToast("TXT 已下载", "success")
  }

  const exportDocx = async () => {
    if (!subtitleRaw) {
      showToast("暂无可下载的字幕", "error")
      return
    }
    if (!subtitleText.trim()) {
      showToast("字幕内容为空", "error")
      return
    }
    const payload = {
      content: subtitleText,
      title: videoInfo?.title || "原始字幕",
      author: videoInfo?.author || videoInfo?.owner?.name || "",
      filename: `${downloadFilename}.docx`,
    }
    try {
      const response = await fetch(`${API_BASE}/api/subtitle/docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        let detail = "DOCX 生成失败"
        try {
          const error = await response.json()
          detail = error.detail || detail
        } catch {
          // ignore
        }
        throw new Error(detail)
      }
      const blob = await response.blob()
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `${downloadFilename}.docx`
      link.click()
      URL.revokeObjectURL(link.href)
      showToast("DOCX 已下载", "success")
    } catch (error) {
      const message = error instanceof Error ? error.message : "DOCX 下载失败"
      showToast(`DOCX 下载失败: ${message}`, "error")
    }
  }

  const handleClear = () => {
    setSubtitleRaw(null)
    setSubtitleText("")
    setVideoInfo(null)
    localStorage.removeItem(SUBTITLE_STORAGE_KEY)
    showToast("已清除保存的文案", "success")
  }

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
            <PrimaryButton onClick={handleGetSubtitle} disabled={loading}>
              {loading ? "获取中..." : "获取字幕"}
            </PrimaryButton>
            <PrimaryButton onClick={downloadTxt} disabled={!hasSubtitle}>
              下载字幕 TXT
            </PrimaryButton>
            <PrimaryButton onClick={exportDocx} disabled={!hasSubtitle}>
              导出 DOCX
            </PrimaryButton>
            <Button
              variant="ghost"
              className="text-rose-500 hover:text-rose-600"
              onClick={() => setClearOpen(true)}
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
            <FieldLabel>视频链接</FieldLabel>
            <FieldContent>
              <div className="flex flex-wrap gap-3">
                <Input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="请输入 B 站视频链接或 BV 号"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault()
                      handleGetSubtitle()
                    }
                  }}
                />
                <Button type="button" onClick={handleGetSubtitle} disabled={loading}>
                  {loading ? "获取中..." : "获取字幕"}
                </Button>
              </div>
            </FieldContent>
            <FieldDescription>支持 bilibili.com、b23.tv、BV 号或 av 号。</FieldDescription>
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
            <Textarea value={subtitleText} readOnly rows={14} />
          </div>
        ) : (
          <Empty title="暂无字幕内容" description="输入视频链接并获取字幕后显示结果。" />
        )}
      </section>

      <AlertDialog
        open={clearOpen}
        onOpenChange={(open) => {
          if (!open) setClearOpen(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除文案</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除当前已保存的文案吗？该操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClearOpen(false)}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setClearOpen(false)
                handleClear()
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

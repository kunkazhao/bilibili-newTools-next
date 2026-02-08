import { useEffect, useMemo, useState } from "react"
import { useToast } from "@/components/Toast"
import ScriptDialogs from "@/components/script/ScriptDialogs"
import ScriptPageView from "@/components/script/ScriptPageView"
import { apiRequest } from "@/lib/api"
import {
  fetchSubtitle,
  formatSubtitleText,
  isValidBilibiliUrl,
  type SubtitlePayload,
} from "@/lib/subtitle"
import * as XLSX from "xlsx"
import { getUserErrorMessage } from "@/lib/errorMessages"

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? ""
const SUBTITLE_STORAGE_KEY = "script_subtitle_data"

type VideoInfo = {
  status: string
  title?: string
  author?: string
  owner?: { name?: string }
}

const sanitizeFilename = (value: string) => {
  return value.replace(/[\\/:*?"<>|]/g, "").trim()
}

export default function ScriptPage() {
  const { showToast } = useToast()
  const [url, setUrl] = useState("")
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

  const fetchVideoInfo = async (inputUrl: string) => {
    const data = await apiRequest<VideoInfo>("/api/bilibili/video-info", {
      method: "POST",
      body: JSON.stringify({ url: inputUrl }),
    })
    if (!data?.status || data.status !== "success") {
      throw new Error("获取视频信息失败")
    }
    return data
  }

  const handleGetSubtitle = async () => {
    const trimmed = url.trim()
    if (!trimmed || !isValidBilibiliUrl(trimmed)) {
      showToast("请输入有效的 B 站链接或 BV 号", "error")
      return
    }
    if (loading) return
    setLoading(true)
    try {
      const [subtitleData, info] = await Promise.all([
        fetchSubtitle(API_BASE, trimmed),
        fetchVideoInfo(trimmed).catch(() => ({ status: "error" } as VideoInfo)),
      ])
      const text = formatSubtitleText(subtitleData)
      setSubtitleText(text)
      if (info.status === "success") {
        setVideoInfo(info)
      }
      saveSubtitleCache(subtitleData, info.status === "success" ? info : null)
      showToast("字幕已获取", "success")
    } catch (error) {
      const message = getUserErrorMessage(error, "获取字幕失败")
      showToast(message, "error")
    } finally {
      setLoading(false)
    }
  }

  const downloadTxt = () => {
    if (!subtitleText.trim()) return
    const blob = new Blob([subtitleText], { type: "text/plain;charset=utf-8" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `${downloadFilename}.txt`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const exportDocx = () => {
    if (!subtitleText.trim()) return
    const rows = subtitleText.split(/\n+/).map((line) => [line])
    const workbook = XLSX.utils.book_new()
    const worksheet = XLSX.utils.aoa_to_sheet([[title], [author], [""], ...rows])
    XLSX.utils.book_append_sheet(workbook, worksheet, "字幕")
    XLSX.writeFile(workbook, `${downloadFilename}.docx`)
  }

  const handleClear = () => {
    setSubtitleText("")
    setVideoInfo(null)
    localStorage.removeItem(SUBTITLE_STORAGE_KEY)
    showToast("已清除保存的文案", "success")
  }

  return (
    <>
      <ScriptPageView
        url={url}
        loading={loading}
        hasSubtitle={hasSubtitle}
        title={title}
        author={author}
        subtitleText={subtitleText}
        onUrlChange={setUrl}
        onSubmit={handleGetSubtitle}
        onDownloadTxt={downloadTxt}
        onExportDocx={exportDocx}
        onRequestClear={() => setClearOpen(true)}
      />
      <ScriptDialogs
        clearOpen={clearOpen}
        onClearOpenChange={setClearOpen}
        onConfirmClear={() => {
          setClearOpen(false)
          handleClear()
        }}
      />
    </>
  )
}

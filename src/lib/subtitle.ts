export type SubtitlePayload =
  | string
  | { body?: { content?: string; text?: string; line?: string }[] }
  | { content?: string; text?: string; line?: string }[]

export const isValidBilibiliUrl = (url: string) => {
  return /bilibili\.com\/video|b23\.tv|^BV[a-zA-Z0-9]+|^av\d+/i.test(url)
}

export const formatSubtitleText = (data: SubtitlePayload) => {
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

export const fetchSubtitle = async (apiBase: string, inputUrl: string) => {
  const base = apiBase?.replace(/\/$/, "") ?? ""
  const formData = new FormData()
  formData.append("url", inputUrl)
  const response = await fetch(`${base}/api/video/subtitle`, {
    method: "POST",
    body: formData,
  })
  if (!response.ok) {
    throw new Error("获取字幕失败")
  }
  const data = (await response.json()) as
    | SubtitlePayload
    | { subtitle?: SubtitlePayload }
  if (data && typeof data === "object" && "subtitle" in data) {
    return data.subtitle ?? ""
  }
  return data
}

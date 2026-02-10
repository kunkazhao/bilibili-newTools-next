const AUTHOR_KEYS = [
  "_source_author",
  "_bili_author",
  "_up_name",
  "_author",
  "author",
]

const SOURCE_LINK_KEYS = ["_source_link", "_promo_link", "source_link", "promo_link"]

const BILI_ID_PATTERN = /^(BV[a-zA-Z0-9]+|av\d+)$/i

const isLikelyLink = (value: string) =>
  /^https?:\/\//i.test(value) || /bilibili\.com|b23\.tv/i.test(value)

const normalizeBiliSourceRef = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith("//")) return `https:${trimmed}`
  const match = trimmed.match(BILI_ID_PATTERN)
  if (!match) return ""
  const biliId = match[1]
  return `https://www.bilibili.com/video/${biliId}`
}

const resolveAuthorName = (spec?: Record<string, string>) => {
  if (!spec) return ""
  for (const key of AUTHOR_KEYS) {
    const value = String(spec[key] ?? "").trim()
    if (value) return value
  }
  return ""
}

const resolveSpecSourceLink = (spec?: Record<string, string>) => {
  if (!spec) return ""
  for (const key of SOURCE_LINK_KEYS) {
    const value = String(spec[key] ?? "").trim()
    if (!value) continue
    if (isLikelyLink(value)) return value
  }
  return ""
}

export const getArchiveSourceDisplay = (options: {
  sourceType?: string | null
  sourceRef?: string | null
  spec?: Record<string, string>
}) => {
  const sourceType = String(options.sourceType ?? "").trim().toLowerCase()
  const sourceRef = String(options.sourceRef ?? "").trim()
  if (sourceType === "video") {
    const author = resolveAuthorName(options.spec)
    if (author) return author
    if (sourceRef && !isLikelyLink(sourceRef)) return sourceRef
    return "\u672a\u77e5\u4f5c\u8005"
  }
  if (sourceRef) return sourceRef
  return "\u624b\u52a8\u6dfb\u52a0"
}

export const getArchiveSourceLink = (options: {
  sourceType?: string | null
  sourceRef?: string | null
  spec?: Record<string, string>
}) => {
  const sourceType = String(options.sourceType ?? "").trim().toLowerCase()
  const sourceRef = String(options.sourceRef ?? "").trim()

  const normalizedVideoRef = normalizeBiliSourceRef(sourceRef)
  if (sourceType === "video" && normalizedVideoRef) {
    return normalizedVideoRef
  }

  if (isLikelyLink(sourceRef)) {
    return sourceRef
  }

  return resolveSpecSourceLink(options.spec)
}

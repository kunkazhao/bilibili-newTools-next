const AUTHOR_KEYS = [
  "_source_author",
  "_bili_author",
  "_up_name",
  "_author",
  "author",
]

const isLikelyLink = (value: string) =>
  /^https?:\/\//i.test(value) || /bilibili\.com|b23\.tv/i.test(value)

const resolveAuthorName = (spec?: Record<string, string>) => {
  if (!spec) return ""
  for (const key of AUTHOR_KEYS) {
    const value = String(spec[key] ?? "").trim()
    if (value) return value
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
    return "未知作者"
  }
  if (sourceRef) return sourceRef
  return "手动添加"
}

export const COMMISSION_SOURCE_LABEL_KEY = "_source_label"

const BILI_ID_PATTERN = /^(BV[a-zA-Z0-9]+|av\d+)$/i

const isBiliLink = (link: string) =>
  /bilibili\.com|b23\.tv|^BV[a-zA-Z0-9]+$|^av\d+$/i.test(link)

const normalizeSourceLink = (link: string) => {
  const trimmed = String(link || "").trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith("//")) return `https:${trimmed}`
  if (BILI_ID_PATTERN.test(trimmed)) {
    return `https://www.bilibili.com/video/${trimmed}`
  }
  return ""
}

export const getCommissionSourceDisplay = (spec: Record<string, string>) => {
  const label = spec[COMMISSION_SOURCE_LABEL_KEY] || ""
  if (label) return label
  const link = spec["_source_link"] || ""
  const author =
    spec["_source_author"] ||
    spec["_bili_author"] ||
    spec["_author"] ||
    spec["_up_name"] ||
    spec["author"] ||
    ""

  if (!link) return "\u624b\u52a8\u6dfb\u52a0"
  if (isBiliLink(link)) {
    return author ? author : "\u672a\u77e5\u4f5c\u8005"
  }
  return link
}

export const getCommissionSourceLink = (spec: Record<string, string>) => {
  const sourceLink = normalizeSourceLink(spec["_source_link"] || "")
  if (sourceLink) return sourceLink
  return normalizeSourceLink(spec["_promo_link"] || "")
}

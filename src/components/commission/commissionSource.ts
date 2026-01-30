export const COMMISSION_SOURCE_LABEL_KEY = "_source_label"

const isBiliLink = (link: string) =>
  /bilibili\.com|b23\.tv|^BV[a-zA-Z0-9]+$|^av\d+$/i.test(link)

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
  if (!link) return "手动添加"
  if (isBiliLink(link)) {
    return author ? author : "未知作者"
  }
  return link
}

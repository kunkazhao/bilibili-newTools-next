const META_KEYS = {
  promoLink: "_promo_link",
  sourceLink: "_source_link",
  shopName: "_shop_name",
}

type ArchiveExportItem = {
  id?: string
  uid?: string
  blueLink?: string
  accountName?: string
  spec?: Record<string, string>
}

const extractDigitsFromLink = (link: string) => {
  if (!link) return ""
  const cleaned = link.trim()
  const exactMatch = cleaned.match(/item\.jd\.com\/(\d+)\.html/i)
  if (exactMatch) return exactMatch[1]
  const paramMatch = cleaned.match(/(?:skuId|sku|productId|wareId|id)[=/](\d{6,})/i)
  if (paramMatch) return paramMatch[1]
  const htmlMatch = cleaned.match(/\/(\d{6,})\.html/i)
  if (htmlMatch) return htmlMatch[1]
  const allDigits = cleaned.match(/(\d{6,})/g)
  if (allDigits && allDigits.length > 0) {
    return allDigits.sort((a, b) => b.length - a.length)[0]
  }
  return ""
}

export const resolveArchiveExportLink = (item: ArchiveExportItem) => {
  const spec = item.spec ?? {}
  return (
    item.blueLink ||
    spec[META_KEYS.sourceLink] ||
    spec[META_KEYS.promoLink] ||
    ""
  ).trim()
}

export const resolveArchiveProductId = (item: ArchiveExportItem) => {
  const spec = item.spec ?? {}
  const link =
    item.blueLink ||
    spec[META_KEYS.sourceLink] ||
    spec[META_KEYS.promoLink] ||
    ""
  const extracted = extractDigitsFromLink(link)
  return extracted || item.uid || item.id || ""
}

export const resolveArchiveShopName = (item: ArchiveExportItem) => {
  const spec = item.spec ?? {}
  return (
    spec[META_KEYS.shopName] ||
    spec.shopName ||
    spec.shop_name ||
    item.accountName ||
    ""
  )
}

export const formatArchivePriceForExport = (value: number | string) => {
  if (value === null || value === undefined || value === "") return ""
  const numeric = Number(value)
  if (Number.isNaN(numeric)) return String(value)
  return `${Math.trunc(numeric)}Ԫ`
}

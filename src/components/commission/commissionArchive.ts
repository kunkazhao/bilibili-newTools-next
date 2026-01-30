export const buildCommissionArchiveSpec = (item: {
  id: string
  spec?: Record<string, string>
  shopName?: string
  sales30?: number
  comments?: number
}) => {
  const spec: Record<string, string> = { ...(item.spec || {}) }
  if (spec._featured) {
    delete spec._featured
  }
  if (item.shopName) spec._shop_name = item.shopName
  if (item.sales30 !== undefined && item.sales30 !== null) {
    spec._s_30 = String(item.sales30)
  }
  if (item.comments !== undefined && item.comments !== null) {
    spec._comments = String(item.comments)
  }
  if (!spec._promo_link) {
    const fallbackLink = spec._source_link || ""
    if (fallbackLink) {
      spec._promo_link = fallbackLink
    }
  }
  if (!spec._temp_id) {
    spec._temp_id = item.id
  }
  return spec
}

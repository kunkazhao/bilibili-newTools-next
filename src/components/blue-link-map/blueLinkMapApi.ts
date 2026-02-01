import { apiRequest } from "@/lib/api"
import type { BlueLinkAccount, BlueLinkCategory, BlueLinkEntry } from "./types"

export const fetchBlueLinkMapState = (productIds?: string[]) => {
  const params = productIds?.length
    ? `?product_ids=${encodeURIComponent(productIds.join(","))}`
    : ""
  return apiRequest<{
    accounts: BlueLinkAccount[]
    categories: BlueLinkCategory[]
    entries: BlueLinkEntry[]
  }>(`/api/blue-link-map/state-v2${params}`)
}

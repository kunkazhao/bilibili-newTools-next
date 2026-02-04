import { apiRequest } from "@/lib/api"
import type { BlueLinkAccount, BlueLinkCategory, BlueLinkEntry } from "./types"

const BLUE_LINK_STATE_V2 = "/api/blue-link-map/state-v2"

export const fetchBlueLinkMapState = async (productIds?: string[]) => {
  const params = productIds?.length
    ? `?product_ids=${encodeURIComponent(productIds.join(","))}`
    : ""
  const v2Path = `${BLUE_LINK_STATE_V2}${params}`
  return apiRequest<{
    accounts: BlueLinkAccount[]
    categories: BlueLinkCategory[]
    entries: BlueLinkEntry[]
  }>(v2Path)
}

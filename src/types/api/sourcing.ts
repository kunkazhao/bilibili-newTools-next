import type { PaginationResponse, SpecField } from "@/types/api/common"

export interface CategoryResponse {
  id: string
  name: string
  sort_order: number | null
  parent_id?: string | null
  spec_fields: SpecField[]
  item_count?: number
}

export interface ItemResponse {
  id: string
  category_id: string
  title: string
  link?: string
  taobao_link?: string
  price?: number
  commission?: number
  commission_rate?: number
  jd_price?: number
  jd_commission?: number
  jd_commission_rate?: number
  jd_sales?: number
  tb_price?: number
  tb_commission?: number
  tb_commission_rate?: number
  tb_sales?: number
  source_type?: string
  source_ref?: string
  cover_url?: string
  remark?: string
  spec?: Record<string, string>
  uid?: string
}

export interface SourcingItemsResponse extends PaginationResponse {
  items: ItemResponse[]
}

export interface SourcingOverviewResponse {
  categories: CategoryResponse[]
  items: ItemResponse[]
  pagination: {
    offset: number
    limit: number
    has_more: boolean
    next_offset: number
  }
}

export interface CategoryCountsResponse {
  counts: Record<string, number>
}

export interface AiBatchStatusResponse {
  id: string
  status: "queued" | "running" | "done" | "error"
  total: number
  processed: number
  success: number
  failed: number
  failures?: { name: string; reason?: string }[]
  error?: string | null
}

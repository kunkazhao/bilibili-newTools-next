import { apiRequest } from "@/lib/api"
import type {
  AiBatchStatusResponse,
  CategoryResponse,
  ItemResponse,
  SourcingItemsResponse,
  SourcingOverviewResponse,
} from "@/types/api/sourcing"

export type {
  CategoryResponse,
  ItemResponse,
} from "@/types/api/sourcing"

export async function fetchCategories(params?: { includeCounts?: boolean }) {
  const query = new URLSearchParams()
  if (params?.includeCounts === false) {
    query.set("include_counts", "false")
  }
  const suffix = query.toString()
    ? `?${query.toString()}`
    : ""
  return apiRequest<{ categories: CategoryResponse[] }>(
    `/api/sourcing/categories${suffix}`
  )
}

export async function fetchCategoryCounts(params?: { force?: boolean }) {
  const query = new URLSearchParams()
  if (params?.force) {
    query.set("force", "true")
  }
  const suffix = query.toString()
    ? `?${query.toString()}`
    : ""
  return apiRequest<{ counts: Record<string, number> }>(
    `/api/sourcing/categories/counts${suffix}`
  )
}

export async function fetchItems(params: {
  categoryId?: string
  limit: number
  offset: number
  keyword?: string
  sort?: "manual"
}) {
  const query = new URLSearchParams()
  query.set("limit", String(params.limit))
  query.set("offset", String(params.offset))
  if (params.categoryId) query.set("category_id", params.categoryId)
  if (params.keyword) query.set("q", params.keyword)
  if (params.sort) query.set("sort", params.sort)
  query.set("fields", "list")
  return apiRequest<SourcingItemsResponse>(`/api/sourcing/items?${query.toString()}`)
}

export async function fetchOverview(params: {
  categoryId?: string
  limit: number
  offset: number
  keyword?: string
  sort?: "manual"
}) {
  const query = new URLSearchParams()
  query.set("limit", String(params.limit))
  query.set("offset", String(params.offset))
  if (params.categoryId) query.set("category_id", params.categoryId)
  if (params.keyword) query.set("q", params.keyword)
  if (params.sort) query.set("sort", params.sort)
  query.set("fields", "list")
  query.set("include_counts", "true")
  return apiRequest<SourcingOverviewResponse>(`/api/sourcing/overview?${query.toString()}`)
}

export async function createCategory(payload: {
  name: string
  sort_order?: number
  parent_id?: string | null
}) {
  return apiRequest<{ category: CategoryResponse }>(
    "/api/sourcing/categories",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
}

export async function updateCategory(
  categoryId: string,
  payload: {
    name?: string
    sort_order?: number
    parent_id?: string | null
    spec_fields?: { key: string; value?: string; example?: string }[]
  }
) {
  return apiRequest<{ category: CategoryResponse }>(
    `/api/sourcing/categories/${categoryId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  )
}

export async function deleteCategory(categoryId: string) {
  return apiRequest(`/api/sourcing/categories/${categoryId}`, {
    method: "DELETE",
  })
}

export async function createItem(payload: {
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
  cover_url?: string
  remark?: string
  spec?: Record<string, string>
}) {
  return apiRequest<{ item: ItemResponse }>(`/api/sourcing/items`, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateItem(
  itemId: string,
  payload: {
    title?: string
    category_id?: string
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
    cover_url?: string
    remark?: string
    spec?: Record<string, string>
  }
) {
  return apiRequest<{ item: ItemResponse }>(`/api/sourcing/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function deleteItem(itemId: string) {
  return apiRequest(`/api/sourcing/items/${itemId}`, {
    method: "DELETE",
  })
}

export async function aiFillPreview(payload: {
  category_id: string
  product_names: string[]
  model?: string
}) {
  return apiRequest<{
    preview: Record<string, string>[]
    spec_fields: string[]
    count: number
  }>(`/api/sourcing/items/ai-fill`, {
    method: "POST",
    body: JSON.stringify({ ...payload, mode: "single" }),
  })
}

export async function aiConfirm(payload: {
  category_id: string
  items: Record<string, string>[]
}) {
  return apiRequest<{ status: string; updated_count: number; not_found_count: number }>(
    `/api/sourcing/items/ai-confirm`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
}

export async function aiBatchStart(payload: {
  category_id?: string
  scheme_id?: string
  keyword?: string
  price_min?: number
  price_max?: number
  sort?: string
  model?: string
}) {
  return apiRequest<{ status: string; job_id: string; total: number }>(
    `/api/sourcing/items/ai-batch/start`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
}

export async function aiBatchStatus(jobId: string) {
  return apiRequest<AiBatchStatusResponse>(`/api/sourcing/items/ai-batch/status/${jobId}`)
}

export async function uploadCoverByUid(uid: string, file: File) {
  const formData = new FormData()
  formData.append("uid", uid)
  formData.append("file", file)

  return apiRequest<{
    success: boolean
    uid?: string
    url?: string
    message?: string
  }>(`/api/sourcing/batch-cover`, {
    method: "POST",
    body: formData,
  })
}

const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? ""

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `HTTP ${response.status}`)
  }
  if (response.status === 204) {
    return {} as T
  }
  return response.json() as Promise<T>
}

export type CategoryResponse = {
  id: string
  name: string
  sort_order: number | null
  spec_fields: { key: string; value?: string; example?: string }[]
  item_count?: number
}

export type ItemResponse = {
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

export async function fetchCategoryCounts() {
  return apiRequest<{ counts: Record<string, number> }>(
    "/api/sourcing/categories/counts"
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
  return apiRequest<{
    items: ItemResponse[]
    has_more: boolean
    next_offset: number
  }>(`/api/sourcing/items?${query.toString()}`)
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
  return apiRequest<{
    categories: CategoryResponse[]
    items: ItemResponse[]
    pagination: {
      offset: number
      limit: number
      has_more: boolean
      next_offset: number
    }
  }>(`/api/sourcing/overview?${query.toString()}`)
}

export async function createCategory(payload: {
  name: string
  sort_order?: number
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

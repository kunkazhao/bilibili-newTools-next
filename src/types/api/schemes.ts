export interface SchemeItem {
  id: string
  title: string
  price?: number
  commission?: number
  commission_rate?: number
  link?: string
  taobao_link?: string
  remark?: string
  spec?: Record<string, string>
}

export interface SchemeSummary {
  id: string
  name: string
  category_id?: string
  category_name?: string
  remark?: string
  item_count?: number
  created_at?: string
  updated_at?: string
}

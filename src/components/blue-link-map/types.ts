import type { Account } from "@/types/account"

export type BlueLinkAccount = Account

export interface BlueLinkCategory {
  id: string
  name: string
  account_id?: string
}

export interface BlueLinkEntry {
  id: string
  source_link?: string
  product_id?: string | null
  product_title?: string
  product_cover?: string
  product_price?: number
  remark?: string | null
  account_id?: string
  category_id?: string
  created_at?: string
  updated_at?: string
}

export interface SourcingItem {
  id: string
  title?: string
  price?: number
  commission_rate?: number
  cover_url?: string
  link?: string
  taobao_link?: string
  updated_at?: string
  created_at?: string
  category_id?: string
  spec?: Record<string, string>
}

export type ProgressFailure = { link: string; name: string; reason: string }

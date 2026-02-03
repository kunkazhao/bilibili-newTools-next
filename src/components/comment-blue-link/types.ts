import type { Account } from "@/types/account"

export type CommentAccount = Account

export interface CommentCombo {
  id: string
  account_id: string
  name: string
  source_link?: string
  content?: string
  product_content?: string | null
  remark?: string
  created_at?: string
  updated_at?: string
}

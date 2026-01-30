export interface CommentAccount {
  id: string
  name: string
}

export interface CommentCategory {
  id: string
  account_id: string
  name: string
  color?: string | null
}

export interface CommentCombo {
  id: string
  account_id: string
  category_id?: string | null
  name: string
  source_link?: string
  content?: string
  remark?: string
  created_at?: string
  updated_at?: string
}

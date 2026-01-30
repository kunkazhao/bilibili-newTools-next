export interface SchemeItem {
  id: string
  title?: string
}

export interface Scheme {
  id: string
  name: string
  category_id: string
  category_name?: string
  remark?: string
  created_at?: string
  items?: SchemeItem[]
}

export interface SchemesPageProps {
  onEnterScheme: (schemeId: string) => void
}

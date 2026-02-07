export type DirectPlanPlatform = "京东" | "淘宝" | "京东+淘宝"

export interface DirectPlan {
  id: string
  platform: DirectPlanPlatform
  category: string
  brand: string
  commission_rate?: string | null
  sort_order?: number | null
  created_at?: string | null
  updated_at?: string | null
}

export type CategoryItem = {
  id: string
  name: string
  sortOrder: number
  count?: number
  specFields?: { key: string; value?: string }[]
}

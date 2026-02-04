export type SpecField = {
  key: string
  value?: string
  example?: string
}

export type CategoryItem = {
  id: string
  name: string
  sortOrder: number
  count?: number
  specFields?: SpecField[]
}

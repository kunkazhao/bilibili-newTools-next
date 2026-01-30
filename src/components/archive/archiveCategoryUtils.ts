export interface ArchiveCategoryLike {
  id: string
  sortOrder?: number
}

export const getDefaultArchiveCategoryId = (
  categories: ArchiveCategoryLike[],
  current: string
) => {
  if (!Array.isArray(categories) || categories.length === 0) return ""
  if (current && current !== "all" && categories.some((item) => item.id === current)) {
    return current
  }
  const sorted = [...categories].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  )
  return sorted[0]?.id ?? ""
}

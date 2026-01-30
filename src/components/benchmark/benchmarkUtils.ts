const CATEGORY_PALETTE = [
  "#6c82ff",
  "#58c1ff",
  "#35b9a5",
  "#f4b23c",
  "#f25f8b",
  "#9b8cfa",
  "#7bd36d",
  "#ff8a65",
]

export const COVER_PLACEHOLDER =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180'><rect fill='%23101828' width='320' height='180'/><text x='50%' y='50%' dy='.35em' fill='%23ffffff' font-size='20' font-family='sans-serif' text-anchor='middle'>No Cover</text></svg>"

const hashString = (input: string) => {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export const pickCategoryColor = (seed: string, fallbackId?: string | null) => {
  const key = seed || fallbackId || ""
  if (!CATEGORY_PALETTE.length) return "#6c82ff"
  const index = hashString(key) % CATEGORY_PALETTE.length
  return CATEGORY_PALETTE[index]
}

export const normalizeCover = (url?: string | null) => {
  if (!url) return ""
  if (url.startsWith("//")) return `https:${url}`
  return url
}

export const formatNumber = (value?: number | null) => {
  if (typeof value !== "number") return "--"
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return value.toString()
}

export const formatDate = (value?: string | number | null) => {
  if (!value) return "--"
  const date = typeof value === "number" ? new Date(value * 1000) : new Date(value)
  if (Number.isNaN(date.getTime())) return "--"
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

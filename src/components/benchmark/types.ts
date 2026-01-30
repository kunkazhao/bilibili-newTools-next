export type BenchmarkCategory = {
  id: string
  name: string
  color?: string | null
}

export type BenchmarkEntry = {
  id: string
  category_id?: string | null
  title?: string | null
  link?: string | null
  bvid?: string | null
  cover?: string | null
  author?: string | null
  duration?: number | null
  pub_time?: string | number | null
  note?: string | null
  owner?: { name?: string }
  stats?: { view?: number; like?: number; reply?: number }
}

export type BenchmarkState = {
  categories: BenchmarkCategory[]
  entries: BenchmarkEntry[]
}

export type VideoInfo = {
  status: string
  link?: string
  bvid?: string
  title?: string
  cover?: string
  duration?: number
  pubdate?: number
  owner?: { name?: string }
  author?: string
  stat?: { view?: number; like?: number; reply?: number }
}

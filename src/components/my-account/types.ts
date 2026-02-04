export type AccountVideo = {
  id: string
  account_id: string
  bvid: string
  title?: string | null
  link?: string | null
  cover?: string | null
  author?: string | null
  duration?: number | null
  pub_time?: string | null
  stats?: { view?: number; like?: number; reply?: number; danmaku?: number; favorite?: number } | null
}

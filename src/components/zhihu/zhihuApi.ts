import { apiRequest } from "@/lib/api"

export type ZhihuKeyword = {
  id: string
  name: string
  created_at?: string
  updated_at?: string
}

export type ZhihuQuestionItem = {
  id: string
  title: string
  url: string
  first_keyword?: string
  view_count_total?: number
  answer_count_total?: number
  view_count_delta?: number
  answer_count_delta?: number
}

export type ZhihuQuestionStat = {
  stat_date: string
  view_count: number
  answer_count: number
}

export const fetchZhihuKeywords = () =>
  apiRequest<{ keywords: ZhihuKeyword[] }>("/api/zhihu/keywords")

export const createZhihuKeyword = (name: string) =>
  apiRequest<{ keyword: ZhihuKeyword }>("/api/zhihu/keywords", {
    method: "POST",
    body: JSON.stringify({ name }),
  })

export const updateZhihuKeyword = (id: string, name: string) =>
  apiRequest<{ keyword: ZhihuKeyword }>(`/api/zhihu/keywords/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  })

export const deleteZhihuKeyword = (id: string) =>
  apiRequest(`/api/zhihu/keywords/${id}`, { method: "DELETE" })

export const fetchZhihuQuestions = (params: {
  keywordId?: string
  q?: string
  limit?: number
  offset?: number
}) => {
  const query = new URLSearchParams()
  if (params.keywordId) query.set("keyword_id", params.keywordId)
  if (params.q) query.set("q", params.q)
  if (params.limit) query.set("limit", String(params.limit))
  if (params.offset) query.set("offset", String(params.offset))
  const suffix = query.toString()
  return apiRequest<{ items: ZhihuQuestionItem[]; total: number }>(
    `/api/zhihu/questions${suffix ? `?${suffix}` : ""}`
  )
}

export const fetchZhihuQuestionStats = (id: string, days = 15) =>
  apiRequest<{ stats: ZhihuQuestionStat[] }>(
    `/api/zhihu/questions/${id}/stats?days=${days}`
  )

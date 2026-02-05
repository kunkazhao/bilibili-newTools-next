import { describe, expect, it, vi } from "vitest"
import { apiRequest } from "@/lib/api"
import {
  createZhihuKeyword,
  deleteZhihuKeyword,
  fetchZhihuKeywords,
  fetchZhihuQuestionStats,
  fetchZhihuQuestions,
  updateZhihuKeyword,
} from "./zhihuApi"

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }))

describe("zhihuApi", () => {
  it("fetchZhihuKeywords hits /api/zhihu/keywords", async () => {
    await fetchZhihuKeywords()
    expect(apiRequest).toHaveBeenCalledWith("/api/zhihu/keywords")
  })

  it("createZhihuKeyword posts name", async () => {
    await createZhihuKeyword("kw")
    expect(apiRequest).toHaveBeenCalledWith("/api/zhihu/keywords", {
      method: "POST",
      body: JSON.stringify({ name: "kw" }),
    })
  })

  it("updateZhihuKeyword patches name", async () => {
    await updateZhihuKeyword("kid", "next")
    expect(apiRequest).toHaveBeenCalledWith("/api/zhihu/keywords/kid", {
      method: "PATCH",
      body: JSON.stringify({ name: "next" }),
    })
  })

  it("deleteZhihuKeyword deletes keyword", async () => {
    await deleteZhihuKeyword("kid")
    expect(apiRequest).toHaveBeenCalledWith("/api/zhihu/keywords/kid", {
      method: "DELETE" },)
  })

  it("fetchZhihuQuestions builds query", async () => {
    await fetchZhihuQuestions({ keywordId: "kid", q: "hello" })
    expect(apiRequest).toHaveBeenCalledWith("/api/zhihu/questions?keyword_id=kid&q=hello")
  })

  it("fetchZhihuQuestionStats hits stats endpoint", async () => {
    await fetchZhihuQuestionStats("qid")
    expect(apiRequest).toHaveBeenCalledWith("/api/zhihu/questions/qid/stats?days=15")
  })
})

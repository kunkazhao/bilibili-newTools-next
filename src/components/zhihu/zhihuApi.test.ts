import { describe, expect, it, vi } from "vitest"
import { apiRequest } from "@/lib/api"
import {
  createZhihuKeyword,
  createZhihuQuestion,
  deleteZhihuKeyword,
  fetchZhihuKeywords,
  fetchZhihuQuestionStats,
  fetchZhihuQuestions,
  fetchZhihuKeywordCounts,
  fetchZhihuScrapeStatus,
  runZhihuScrape,
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
    await fetchZhihuQuestions({ keywordId: "kid", q: "hello", limit: 50, offset: 0 })
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/zhihu/questions?keyword_id=kid&q=hello&limit=50&offset=0"
    )
  })

  it("fetchZhihuQuestionStats hits stats endpoint", async () => {
    await fetchZhihuQuestionStats("qid")
    expect(apiRequest).toHaveBeenCalledWith("/api/zhihu/questions/qid/stats?days=15")
  })

  it("createZhihuQuestion posts question link and keyword", async () => {
    await createZhihuQuestion({
      questionUrl: "https://www.zhihu.com/question/1",
      keywordId: "kid",
    })
    expect(apiRequest).toHaveBeenCalledWith("/api/zhihu/questions", {
      method: "POST",
      body: JSON.stringify({
        question_url: "https://www.zhihu.com/question/1",
        keyword_id: "kid",
      }),
    })
  })

  it("fetchZhihuKeywordCounts hits counts endpoint", async () => {
    await fetchZhihuKeywordCounts()
    expect(apiRequest).toHaveBeenCalledWith("/api/zhihu/keywords/counts")
  })

  it("runZhihuScrape posts keyword id", async () => {
    await runZhihuScrape({ keywordId: "kid" })
    expect(apiRequest).toHaveBeenCalledWith("/api/zhihu/scrape/run", {
      method: "POST",
      body: JSON.stringify({ keyword_id: "kid" }),
    })
  })

  it("runZhihuScrape normalizes job id from id field", async () => {
    const mockApi = vi.mocked(apiRequest)
    mockApi.mockResolvedValueOnce({ id: "job-1", status: "queued" })
    const result = await runZhihuScrape({ keywordId: "kid" })
    expect(result.job_id).toBe("job-1")
  })

  it("fetchZhihuScrapeStatus hits status endpoint", async () => {
    await fetchZhihuScrapeStatus("job-1")
    expect(apiRequest).toHaveBeenCalledWith("/api/zhihu/scrape/status/job-1")
  })
})

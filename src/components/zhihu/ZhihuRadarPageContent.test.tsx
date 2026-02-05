// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, waitFor } from "@testing-library/react"
import ZhihuRadarPageContent from "./ZhihuRadarPageContent"
import { fetchZhihuKeywordCounts, fetchZhihuKeywords, fetchZhihuQuestions } from "./zhihuApi"

const showToast = vi.fn()
let latestViewProps: any = null

vi.mock("./ZhihuRadarPageView", () => ({
  default: (props: any) => {
    latestViewProps = props
    return null
  },
}))

vi.mock("./zhihuApi", () => ({
  fetchZhihuKeywords: vi.fn(),
  fetchZhihuKeywordCounts: vi.fn(),
  fetchZhihuQuestions: vi.fn(),
  createZhihuKeyword: vi.fn(),
  updateZhihuKeyword: vi.fn(),
  deleteZhihuKeyword: vi.fn(),
  fetchZhihuQuestionStats: vi.fn(),
  runZhihuScrape: vi.fn(),
  fetchZhihuScrapeStatus: vi.fn(),
}))

vi.mock("@/components/Toast", () => ({
  useToast: () => ({ showToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}))


describe("ZhihuRadarPageContent", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    latestViewProps = null
  })

  it("loads keywords and questions on mount", async () => {
    vi.mocked(fetchZhihuKeywords).mockResolvedValue({
      keywords: [{ id: "k1", name: "kw1" }],
    })
    vi.mocked(fetchZhihuKeywordCounts).mockResolvedValue({
      counts: { k1: 12 },
      total: 15,
    })
    vi.mocked(fetchZhihuQuestions).mockResolvedValue({
      items: [
        {
          id: "q1",
          title: "title",
          url: "https://example.com",
          first_keyword: "kw1",
          view_count_total: 10,
          answer_count_total: 1,
          view_count_delta: 2,
          answer_count_delta: 1,
        },
      ],
      total: 15,
      pagination: {
        offset: 0,
        limit: 50,
        has_more: false,
        next_offset: 1,
        total: 15,
      },
    })

    render(<ZhihuRadarPageContent />)

    await waitFor(() => expect(fetchZhihuKeywords).toHaveBeenCalled())
    await waitFor(() => expect(fetchZhihuKeywordCounts).toHaveBeenCalled())
    await waitFor(() => expect(fetchZhihuQuestions).toHaveBeenCalled())

    expect(latestViewProps?.keywords?.length).toBe(1)
    expect(latestViewProps?.keywords?.[0]?.count).toBe(12)
    expect(latestViewProps?.items?.length).toBe(1)
  })
})

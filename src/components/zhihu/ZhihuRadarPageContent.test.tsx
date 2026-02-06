// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, waitFor } from "@testing-library/react"
import ZhihuRadarPageContent from "./ZhihuRadarPageContent"
import {
  createZhihuQuestion,
  fetchZhihuKeywordCounts,
  fetchZhihuKeywords,
  fetchZhihuQuestions,
} from "./zhihuApi"

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
  createZhihuQuestion: vi.fn(),
  createZhihuKeyword: vi.fn(),
  updateZhihuKeyword: vi.fn(),
  deleteZhihuKeyword: vi.fn(),
  deleteZhihuQuestion: vi.fn(),
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
    localStorage.clear()
    vi.clearAllMocks()
    latestViewProps = null
  })

  it("defers keyword count request until first list load finishes", async () => {
    vi.mocked(fetchZhihuKeywords).mockResolvedValue({
      keywords: [{ id: "k1", name: "kw1" }],
    })
    vi.mocked(fetchZhihuKeywordCounts).mockResolvedValue({
      counts: { k1: 12 },
      total: 15,
    })

    vi.mocked(fetchZhihuQuestions).mockImplementation(
      () => new Promise(() => undefined) as any
    )

    render(<ZhihuRadarPageContent />)

    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(fetchZhihuKeywordCounts).not.toHaveBeenCalled()
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
    await waitFor(() => expect(latestViewProps?.keywords?.length).toBe(1))

    expect(latestViewProps?.keywords?.length).toBe(1)
    expect(latestViewProps?.keywords?.[0]?.count).toBe(12)
    expect(latestViewProps?.items?.length).toBe(1)
  })

  it("adds question to the top after manual add", async () => {
    vi.mocked(fetchZhihuKeywords).mockResolvedValue({
      keywords: [{ id: "k1", name: "kw1" }],
    })
    vi.mocked(fetchZhihuKeywordCounts).mockResolvedValue({
      counts: { k1: 2 },
      total: 2,
    })

    const oldList = {
      items: [
        {
          id: "q1",
          title: "old",
          url: "https://example.com/1",
          first_keyword: "kw1",
          view_count_total: 1,
          answer_count_total: 1,
          view_count_delta: 0,
          answer_count_delta: 0,
        },
      ],
      total: 2,
      pagination: {
        offset: 0,
        limit: 50,
        has_more: false,
        next_offset: 1,
        total: 2,
      },
    }
    const newList = {
      items: [
        {
          id: "q2",
          title: "new",
          url: "https://example.com/2",
          first_keyword: "kw1",
          view_count_total: 10,
          answer_count_total: 2,
          view_count_delta: 3,
          answer_count_delta: 1,
        },
        {
          id: "q1",
          title: "old",
          url: "https://example.com/1",
          first_keyword: "kw1",
          view_count_total: 1,
          answer_count_total: 1,
          view_count_delta: 0,
          answer_count_delta: 0,
        },
      ],
      total: 2,
      pagination: {
        offset: 0,
        limit: 50,
        has_more: false,
        next_offset: 2,
        total: 2,
      },
    }

    let includeNewQuestion = false
    vi.mocked(fetchZhihuQuestions).mockImplementation(async () =>
      includeNewQuestion ? (newList as any) : (oldList as any)
    )
    vi.mocked(createZhihuQuestion).mockImplementation(async () => {
      includeNewQuestion = true
      return {
        item: {
          id: "q2",
          title: "new",
          url: "https://example.com/2",
          first_keyword: "kw1",
          view_count_total: 10,
          answer_count_total: 2,
          view_count_delta: 3,
          answer_count_delta: 1,
        },
        is_new: true,
      }
    })

    render(<ZhihuRadarPageContent />)

    await waitFor(() => expect(latestViewProps?.keywords?.length).toBe(1))
    await waitFor(() => expect(latestViewProps?.items?.[0]?.id).toBe("q1"))

    latestViewProps.onOpenAddQuestion()
    latestViewProps.addQuestionDialog.onQuestionUrlChange("https://www.zhihu.com/question/2")
    latestViewProps.addQuestionDialog.onKeywordChange("k1")

    await waitFor(() =>
      expect(latestViewProps.addQuestionDialog.keywordId).toBe("k1")
    )
    await waitFor(() =>
      expect(latestViewProps.addQuestionDialog.questionUrl).toBe("https://www.zhihu.com/question/2")
    )

    await latestViewProps.addQuestionDialog.onConfirm()

    await waitFor(() =>
      expect(createZhihuQuestion).toHaveBeenCalledWith({
        questionUrl: "https://www.zhihu.com/question/2",
        keywordId: "k1",
      })
    )
  })


})

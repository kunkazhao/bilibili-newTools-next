import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchSubtitle, formatSubtitleText, isValidBilibiliUrl } from "./subtitle"

describe("isValidBilibiliUrl", () => {
  it("accepts bilibili links and ids", () => {
    expect(isValidBilibiliUrl("https://www.bilibili.com/video/BV1xx411c7mD"))
      .toBe(true)
    expect(isValidBilibiliUrl("https://b23.tv/abc123")).toBe(true)
    expect(isValidBilibiliUrl("BV1xx411c7mD")).toBe(true)
    expect(isValidBilibiliUrl("av123456")).toBe(true)
  })

  it("rejects unrelated links", () => {
    expect(isValidBilibiliUrl("https://example.com/video/123")).toBe(false)
    expect(isValidBilibiliUrl("")).toBe(false)
  })
})

describe("formatSubtitleText", () => {
  it("handles plain string payload", () => {
    expect(formatSubtitleText(" hello\nworld ")).toBe("hello\nworld")
  })

  it("handles array payloads", () => {
    const payload = [
      { content: "第一行" },
      { text: "第二行" },
      { line: "第三行" },
    ]
    expect(formatSubtitleText(payload)).toBe("第一行\n第二行\n第三行")
  })

  it("handles nested body payloads", () => {
    const payload = {
      body: [
        { content: "a" },
        { text: "b" },
        { line: "c" },
      ],
    }
    expect(formatSubtitleText(payload)).toBe("a\nb\nc")
  })
})

describe("fetchSubtitle", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it("posts form data to subtitle endpoint", async () => {
    const response = { ok: true, json: async () => ({ content: "ok" }) }
    const fetchSpy = vi.fn().mockResolvedValue(response)
    globalThis.fetch = fetchSpy as unknown as typeof fetch

    await fetchSubtitle("http://localhost:8000", "https://b23.tv/abc")

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url, options] = fetchSpy.mock.calls[0]
    expect(url).toBe("http://localhost:8000/api/video/subtitle")
    expect(options?.method).toBe("POST")
    expect(options?.body).toBeInstanceOf(FormData)
    expect((options?.body as FormData)?.get("url")).toBe("https://b23.tv/abc")
  })

  it("unwraps subtitle field when response wraps payload", async () => {
    const response = {
      ok: true,
      json: async () => ({
        status: "success",
        subtitle: [{ content: "hi" }],
      }),
    }
    globalThis.fetch = vi.fn().mockResolvedValue(response) as unknown as typeof fetch

    const payload = await fetchSubtitle("http://localhost:8000", "BV1xx411c7mD")

    expect(Array.isArray(payload)).toBe(true)
    expect(formatSubtitleText(payload)).toBe("hi")
  })

  it("throws when response is not ok", async () => {
    const response = { ok: false, json: async () => ({}) }
    globalThis.fetch = vi.fn().mockResolvedValue(response) as unknown as typeof fetch

    await expect(fetchSubtitle("", "BV1xx411c7mD")).rejects.toThrow("获取字幕失败")
  })
})

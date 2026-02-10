import { afterEach, describe, expect, it, vi } from "vitest"
import { buildComboContent, buildProductContent, getPinnedComments } from "./bilibili"

type JsonResponse = {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<any>
}

const createJsonResponse = (payload: any): JsonResponse => ({
  ok: true,
  status: 200,
  statusText: "OK",
  json: async () => payload,
})

const FALLBACK_PRODUCT_TEXT = "未获取到商品名称"

const originalFetch = globalThis.fetch

afterEach(() => {
  vi.restoreAllMocks()
  globalThis.fetch = originalFetch
})

describe("getPinnedComments", () => {
  it("handles top.upper payload from reply/main API", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const requestUrl = typeof input === "string" ? input : input.toString()
      if (!requestUrl.includes("/api/bilibili/proxy")) {
        throw new Error(`Unexpected fetch target: ${requestUrl}`)
      }

      const payload = JSON.parse(String(init?.body ?? "{}")) as { url?: string }
      const proxyUrl = payload.url || ""

      if (proxyUrl.includes("x/web-interface/view")) {
        return createJsonResponse({ code: 0, data: { aid: 123456, bvid: "BV1DD61B7Ea4" } })
      }

      if (proxyUrl.includes("x/v2/reply?")) {
        return createJsonResponse({
          code: 0,
          data: { top: null, upper: { top: null }, replies: null },
        })
      }

      if (proxyUrl.includes("x/v2/reply/main?")) {
        return createJsonResponse({
          code: 0,
          data: {
            top: {
              upper: {
                rpid: 1001,
                rpid_str: "1001",
                rcount: 0,
                member: { uname: "UP" },
                content: {
                  message: "see https://b23.tv/abc",
                  jump_url: {
                    "https://b23.tv/abc": { title: "itemA" },
                  },
                },
              },
            },
            replies: [],
          },
        })
      }

      throw new Error(`Unhandled proxy URL: ${proxyUrl}`)
    })

    vi.stubGlobal("fetch", fetchMock as unknown as typeof fetch)

    const result = await getPinnedComments("https://www.bilibili.com/video/BV1DD61B7Ea4")

    expect(result.pinnedComments).toHaveLength(1)
    expect(result.pinnedComments[0]?.content?.message).toContain("https://b23.tv/abc")
    expect(buildComboContent(result)).toContain("https://b23.tv/abc")
  })
})

describe("buildProductContent", () => {
  it("extracts jump_url titles for short links and de-dupes", () => {
    const result = {
      pinnedComments: [
        {
          content: {
            message: "pick https://b23.tv/abc and https://b23.tv/def",
            jump_url: {
              "https://b23.tv/abc": { title: "itemA" },
              "https://b23.tv/def": { title: "itemB" },
            },
          },
        },
        {
          content: {
            message: "duplicate https://b23.tv/abc",
            jump_url: {
              "https://b23.tv/abc": { title: "itemA" },
            },
          },
        },
      ],
      subReplies: [],
    }

    expect(buildProductContent(result)).toBe(
      "itemA-- https://b23.tv/abc\nitemB-- https://b23.tv/def"
    )
  })

  it("returns fallback when no product lines", () => {
    const result = {
      pinnedComments: [{ content: { message: "only short link https://b23.tv/xyz" } }],
      subReplies: [],
    }

    expect(buildProductContent(result)).toBe(FALLBACK_PRODUCT_TEXT)
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { apiRequest } from "@/lib/api"
import { fetchCommentBlueLinkState } from "./commentBlueLinkApi"

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }))

describe("commentBlueLinkApi", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses v2 state endpoint", async () => {
    await fetchCommentBlueLinkState()
    expect(apiRequest).toHaveBeenCalledWith("/api/comment/blue-links/state-v2")
  })

  it("does not fall back to v1 when v2 returns 404", async () => {
    const mockApi = vi.mocked(apiRequest)
    mockApi.mockRejectedValueOnce(new Error("Not Found"))

    await expect(fetchCommentBlueLinkState()).rejects.toThrow("Not Found")

    expect(mockApi).toHaveBeenCalledTimes(1)
    expect(mockApi).toHaveBeenCalledWith("/api/comment/blue-links/state-v2")
  })
})

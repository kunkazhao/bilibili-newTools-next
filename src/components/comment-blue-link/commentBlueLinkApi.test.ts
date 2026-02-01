import { describe, expect, it, vi } from "vitest"
import { apiRequest } from "@/lib/api"
import { fetchCommentBlueLinkState } from "./commentBlueLinkApi"

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }))

describe("commentBlueLinkApi", () => {
  it("uses v2 state endpoint", async () => {
    await fetchCommentBlueLinkState()
    expect(apiRequest).toHaveBeenCalledWith("/api/comment/blue-links/state-v2")
  })
})

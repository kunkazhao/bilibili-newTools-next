import { beforeEach, describe, expect, it, vi } from "vitest"
import { apiRequest } from "@/lib/api"
import { fetchBlueLinkMapState } from "./blueLinkMapApi"

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }))

describe("blueLinkMapApi", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("uses v2 state endpoint without product ids", async () => {
    await fetchBlueLinkMapState()
    expect(apiRequest).toHaveBeenCalledWith("/api/blue-link-map/state-v2")
  })

  it("adds product_ids when provided", async () => {
    await fetchBlueLinkMapState(["a", "b"])
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/blue-link-map/state-v2?product_ids=a%2Cb"
    )
  })

  it("does not fall back to v1 when v2 returns 404", async () => {
    const mockApi = vi.mocked(apiRequest)
    mockApi.mockRejectedValueOnce(new Error("Not Found"))

    await expect(fetchBlueLinkMapState()).rejects.toThrow("Not Found")

    expect(mockApi).toHaveBeenCalledTimes(1)
    expect(mockApi).toHaveBeenCalledWith("/api/blue-link-map/state-v2")
  })
})

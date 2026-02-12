import { describe, expect, it, vi } from "vitest"
import { apiRequest } from "@/lib/api"
import {
  fetchBenchmarkAccountState,
  syncBenchmarkAccountVideos,
} from "./benchmarkAccountApi"

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }))

describe("benchmarkAccountApi", () => {
  it("fetchBenchmarkAccountState hits /api/benchmark-accounts/state", async () => {
    await fetchBenchmarkAccountState("acc-1")
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/benchmark-accounts/state?account_id=acc-1"
    )
  })

  it("syncBenchmarkAccountVideos hits /api/benchmark-accounts/sync", async () => {
    await syncBenchmarkAccountVideos("acc-1")
    expect(apiRequest).toHaveBeenCalledWith("/api/benchmark-accounts/sync", {
      method: "POST",
      body: JSON.stringify({ account_id: "acc-1" }),
    })
  })
})

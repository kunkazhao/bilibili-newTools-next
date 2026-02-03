import { describe, expect, it, vi } from "vitest"
import { apiRequest } from "@/lib/api"
import { fetchMyAccountState, syncMyAccountVideos } from "./myAccountApi"

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }))

describe("myAccountApi", () => {
  it("fetchMyAccountState hits /api/my-accounts/state", async () => {
    await fetchMyAccountState("acc-1")
    expect(apiRequest).toHaveBeenCalledWith(
      "/api/my-accounts/state?account_id=acc-1"
    )
  })

  it("syncMyAccountVideos hits /api/my-accounts/sync", async () => {
    await syncMyAccountVideos("acc-1")
    expect(apiRequest).toHaveBeenCalledWith("/api/my-accounts/sync", {
      method: "POST",
      body: JSON.stringify({ account_id: "acc-1" }),
    })
  })
})

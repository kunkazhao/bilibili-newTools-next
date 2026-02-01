import { describe, expect, it, vi } from "vitest"
import { apiRequest } from "@/lib/api"
import { createAccount, deleteAccount, fetchAccounts, updateAccount } from "./accountsApi"

vi.mock("@/lib/api", () => ({ apiRequest: vi.fn() }))

describe("accountsApi", () => {
  it("fetchAccounts calls /api/accounts", async () => {
    await fetchAccounts()
    expect(apiRequest).toHaveBeenCalledWith("/api/accounts")
  })

  it("createAccount uses POST", async () => {
    await createAccount({ name: "Test" })
    expect(apiRequest).toHaveBeenCalledWith("/api/accounts", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    })
  })

  it("updateAccount uses PATCH", async () => {
    await updateAccount("acc-1", { name: "Next" })
    expect(apiRequest).toHaveBeenCalledWith("/api/accounts/acc-1", {
      method: "PATCH",
      body: JSON.stringify({ name: "Next" }),
    })
  })

  it("deleteAccount uses DELETE", async () => {
    await deleteAccount("acc-1")
    expect(apiRequest).toHaveBeenCalledWith("/api/accounts/acc-1", {
      method: "DELETE",
    })
  })
})

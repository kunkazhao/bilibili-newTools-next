import { describe, expect, it } from "vitest"
import { resolveSelectedAccountId } from "./blueLinkSelection"

describe("resolveSelectedAccountId", () => {
  it("returns empty when no accounts", () => {
    expect(resolveSelectedAccountId([], null)).toBe("")
  })

  it("returns cached id when valid", () => {
    const accounts = [{ id: "a" }, { id: "b" }]
    expect(resolveSelectedAccountId(accounts, "b")).toBe("b")
  })

  it("falls back to first account when cached id missing", () => {
    const accounts = [{ id: "a" }, { id: "b" }]
    expect(resolveSelectedAccountId(accounts, "c")).toBe("a")
  })

  it("falls back to first account when cached id is empty", () => {
    const accounts = [{ id: "a" }, { id: "b" }]
    expect(resolveSelectedAccountId(accounts, "")).toBe("a")
  })
})
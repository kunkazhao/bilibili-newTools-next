// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import {
  buildSchemeDetailUrl,
  getStandaloneSchemeId,
  openSchemeDetailPage,
} from "./standaloneRoutes"

describe("standaloneRoutes", () => {
  it("builds scheme detail url with standalone flag", () => {
    const url = buildSchemeDetailUrl("scheme-1", "https://example.com/app")

    expect(url).toContain("schemeId=scheme-1")
    expect(url).toContain("standalone=1")
  })

  it("returns scheme id only when standalone flag is set", () => {
    expect(getStandaloneSchemeId("?schemeId=abc&standalone=1")).toBe("abc")
    expect(getStandaloneSchemeId("?schemeId=abc")).toBeNull()
  })

  it("opens a new page and falls back when blocked", () => {
    const open = vi.fn(() => null)
    const fallback = vi.fn()

    openSchemeDetailPage("scheme-2", {
      baseUrl: "https://example.com/app",
      open,
      fallback,
    })

    expect(open).toHaveBeenCalled()
    expect(fallback).toHaveBeenCalled()
  })
})

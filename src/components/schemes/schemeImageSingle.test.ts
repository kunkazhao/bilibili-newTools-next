import { describe, expect, it } from "vitest"
import { selectSingleImageTarget } from "./schemeImageSingle"

const items = [{ id: "a", title: "A" }]
const templates = [{ id: "t1", html: "<div></div>" }]

describe("selectSingleImageTarget", () => {
  it("returns error when template missing", () => {
    const result = selectSingleImageTarget(items, templates, "", "a")
    expect(result.ok).toBe(false)
  })

  it("returns item and template when present", () => {
    const result = selectSingleImageTarget(items, templates, "t1", "a")
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.item.id).toBe("a")
      expect(result.template.id).toBe("t1")
    }
  })
})

// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { getDefaultArchiveCategoryId } from "./archiveCategoryUtils"

describe("getDefaultArchiveCategoryId", () => {
  it("returns first category when current is all", () => {
    const result = getDefaultArchiveCategoryId(
      [
        { id: "cat-1", name: "分类1", sortOrder: 2 },
        { id: "cat-2", name: "分类2", sortOrder: 1 },
      ],
      "all"
    )

    expect(result).toBe("cat-2")
  })

  it("returns current when it exists", () => {
    const result = getDefaultArchiveCategoryId(
      [
        { id: "cat-1", name: "分类1", sortOrder: 0 },
        { id: "cat-2", name: "分类2", sortOrder: 1 },
      ],
      "cat-2"
    )

    expect(result).toBe("cat-2")
  })

  it("returns empty when there are no categories", () => {
    expect(getDefaultArchiveCategoryId([], "all")).toBe("")
  })
})

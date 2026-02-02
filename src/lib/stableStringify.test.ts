import { describe, expect, it } from "vitest"

import { stableStringify } from "./stableStringify"

describe("stableStringify", () => {
  it("sorts object keys deterministically", () => {
    const a = stableStringify({ b: 2, a: 1 })
    const b = stableStringify({ a: 1, b: 2 })
    expect(a).toBe(b)
  })

  it("handles nested objects and arrays", () => {
    const value = stableStringify({ b: [2, 1], a: { d: 4, c: 3 } })
    expect(value).toBe("{\"a\":{\"c\":3,\"d\":4},\"b\":[2,1]}")
  })
})

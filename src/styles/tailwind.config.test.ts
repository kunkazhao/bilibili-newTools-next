import { describe, expect, it } from "vitest"
import config from "../../tailwind.config.js"

describe("tailwind theme", () => {
  it("disables the global card shadow", () => {
    const cardShadow = config?.theme?.extend?.boxShadow?.card
    expect(cardShadow).toBe("none")
  })
})

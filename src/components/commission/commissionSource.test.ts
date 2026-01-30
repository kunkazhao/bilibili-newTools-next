// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { getCommissionSourceDisplay } from "./commissionSource"

describe("getCommissionSourceDisplay", () => {
  it("prefers source label over link", () => {
    const display = getCommissionSourceDisplay({
      _source_label: "链接提取",
      _source_link: "https://union-click.jd.com/test",
    })

    expect(display).toBe("链接提取")
  })
})

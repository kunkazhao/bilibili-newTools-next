// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { getCommissionExportHeaders, getCommissionExportColumns } from "./commissionExport"

describe("commission export", () => {
  it("omits focus column", () => {
    expect(getCommissionExportHeaders()).not.toContain("重点标记")
  })

  it("matches column widths to headers", () => {
    expect(getCommissionExportColumns().length).toBe(getCommissionExportHeaders().length)
  })
})

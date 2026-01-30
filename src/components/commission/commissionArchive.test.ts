// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { buildCommissionArchiveSpec } from "./commissionArchive"

describe("buildCommissionArchiveSpec", () => {
  it("drops featured flag from spec", () => {
    const spec = buildCommissionArchiveSpec({
      id: "item-1",
      spec: { _featured: "true", _source_link: "https://example.com" },
      shopName: "店铺",
      sales30: 12,
      comments: 3,
    })

    expect(spec._featured).toBeUndefined()
  })
})

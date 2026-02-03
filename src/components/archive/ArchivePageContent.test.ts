import { describe, expect, it } from "vitest"
import { buildArchiveMetricsPayload } from "./ArchivePageContent"

describe("buildArchiveMetricsPayload", () => {
  it("computes jd/tb metrics and commissions", () => {
    const payload = buildArchiveMetricsPayload({
      price: "100",
      commissionRate: "10",
      sales30: "50",
      tbPrice: "200",
      tbCommissionRate: "20",
      tbSales: "30",
    })

    expect(payload).toEqual({
      price: 100,
      commission: 10,
      commission_rate: 10,
      jd_price: 100,
      jd_commission: 10,
      jd_commission_rate: 10,
      jd_sales: 50,
      tb_price: 200,
      tb_commission: 40,
      tb_commission_rate: 20,
      tb_sales: 30,
    })
  })
})

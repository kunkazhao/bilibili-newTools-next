import { describe, expect, it } from "vitest"
import {
  formatArchivePriceForExport,
  resolveArchiveExportLink,
  resolveArchiveProductId,
  resolveArchiveShopName,
} from "./archiveExport"

describe("archive export helpers", () => {
  it("prefers blue link over promo link for export link", () => {
    const item = {
      id: "item-1",
      uid: "UID-1",
      blueLink: "https://item.jd.com/123456.html",
      spec: {
        _promo_link: "https://union-click.jd.com/jdc?e=abc",
        _source_link: "https://www.bilibili.com/video/BV1",
        _shop_name: "������Ӫ�콢��",
      },
    }

    expect(resolveArchiveExportLink(item)).toBe("https://item.jd.com/123456.html")
  })

  it("extracts product id from the export link", () => {
    const item = {
      id: "item-2",
      uid: "UID-2",
      blueLink: "https://item.jd.com/998877.html",
      spec: {
        _promo_link: "https://union-click.jd.com/jdc?e=abc",
      },
    }

    expect(resolveArchiveProductId(item)).toBe("998877")
  })

  it("falls back to other shop name fields when _shop_name is missing", () => {
    const item = {
      id: "item-3",
      uid: "UID-3",
      blueLink: "",
      accountName: "�˺ŵ���",
      spec: {
        shopName: "���õ���",
      },
    }

    expect(resolveArchiveShopName(item)).toBe("���õ���")
  })

  it("formats price without decimals", () => {
    expect(formatArchivePriceForExport(78)).toBe("78元")
    expect(formatArchivePriceForExport("78.9")).toBe("78元")
  })
})

import { describe, expect, it } from "vitest"
import { buildProductContent } from "./bilibili"

describe("buildProductContent", () => {
  it("extracts jump_url titles for short links and de-dupes", () => {
    const result = {
      pinnedComments: [
        {
          content: {
            message: "推荐 https://b23.tv/abc 以及 https://b23.tv/def",
            jump_url: {
              "https://b23.tv/abc": { title: "商品A" },
              "https://b23.tv/def": { title: "商品B" },
            },
          },
        },
        {
          content: {
            message: "重复 https://b23.tv/abc",
            jump_url: {
              "https://b23.tv/abc": { title: "商品A" },
            },
          },
        },
      ],
      subReplies: [],
    }

    expect(buildProductContent(result)).toBe(
      "商品A-- https://b23.tv/abc\n商品B-- https://b23.tv/def"
    )
  })

  it("returns fallback when no product lines", () => {
    const result = {
      pinnedComments: [{ content: { message: "只有短链 https://b23.tv/xyz" } }],
      subReplies: [],
    }

    expect(buildProductContent(result)).toBe("未获取到商品名称")
  })
})

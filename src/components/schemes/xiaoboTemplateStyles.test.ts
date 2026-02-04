import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const getXiaoboTemplate = () =>
  readFileSync(join(process.cwd(), "templates", "image-templates", "xiaobo.html"), "utf8")

describe("xiaobo template styles", () => {
  it("uses a readable line-height for the hero title", () => {
    const html = getXiaoboTemplate()
    const match = html.match(/\.tpl-img-hero-title\s*\{[\s\S]*?line-height:\s*([0-9.]+)/)
    expect(match).not.toBeNull()
    const lineHeight = Number(match?.[1] ?? 0)
    expect(lineHeight).toBeGreaterThanOrEqual(1.4)
  })
})

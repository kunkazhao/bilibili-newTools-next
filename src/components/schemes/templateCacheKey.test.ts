import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

describe("image template cache key", () => {
  it("bumps the cache key to pick up template updates", () => {
    const file = readFileSync(
      join(process.cwd(), "src", "components", "schemes", "SchemeDetailPageContent.tsx"),
      "utf8"
    )
    expect(file).toContain('image_template_cache_v2')
  })
})

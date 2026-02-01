import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

describe("global typography", () => {
  it("sets html base font-size to 17px", () => {
    const css = readFileSync(resolve(__dirname, "index.css"), "utf-8")
    expect(css).toMatch(/html\s*\{[^}]*font-size:\s*17px;?/s)
  })
})

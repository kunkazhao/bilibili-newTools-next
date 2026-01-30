import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const dragText = "\u62d6\u62fd"

const collectFiles = (dir: string): string[] => {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      return collectFiles(fullPath)
    }
    if (!entry.isFile()) return []
    if (!/\.(ts|tsx)$/.test(entry.name)) return []
    return [fullPath]
  })
}

describe("UI text", () => {
  it("does not use literal drag text in components or pages", () => {
    const roots = [
      join(process.cwd(), "src", "components"),
      join(process.cwd(), "src", "pages"),
    ]
    const matches: string[] = []
    roots.forEach((root) => {
      if (!statSync(root).isDirectory()) return
      collectFiles(root).forEach((file) => {
        const content = readFileSync(file, "utf-8")
        if (content.includes(dragText)) {
          matches.push(file)
        }
      })
    })
    expect(matches).toEqual([])
  })
})

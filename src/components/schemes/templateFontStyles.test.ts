import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const templatesDir = join(process.cwd(), "templates", "image-templates")
const templateFiles = readdirSync(templatesDir).filter((file) => file.endsWith(".html"))

const loadTemplate = (file: string) => readFileSync(join(templatesDir, file), "utf8")

describe("image templates font setup", () => {
  it("embeds Noto Sans SC via @font-face", () => {
    for (const file of templateFiles) {
      const html = loadTemplate(file)
      expect(html).toMatch(/@font-face[\s\S]*font-family:\s*\"Noto Sans SC\"/)
      expect(html).toContain("/fonts/noto-sans-sc/NotoSansSC-VariableFont_wght.ttf")
    }
  })

  it("sets tpl font variables to Noto Sans SC", () => {
    for (const file of templateFiles) {
      const html = loadTemplate(file)
      expect(html).toMatch(/--tpl-font:\s*\"Noto Sans SC\"/)
      expect(html).toMatch(/--tpl-title-font:\s*\"Noto Sans SC\"/)
      expect(html).toMatch(/--tpl-summary-font:\s*\"Noto Sans SC\"/)
    }
  })

  it("applies a baseline offset for titles", () => {
    for (const file of templateFiles) {
      const html = loadTemplate(file)
      expect(html).toMatch(/--tpl-title-offset:\s*-4px/)
      expect(html).toMatch(/\.tpl-title\s*\{[\s\S]*?transform:\s*translateY\(var\(--tpl-title-offset\)\)/)
    }
  })
})

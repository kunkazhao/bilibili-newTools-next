// @vitest-environment node
import { describe, expect, it } from "vitest"
import { existsSync } from "node:fs"
import { resolve } from "node:path"

describe("ui toast wrapper cleanup", () => {
  it("does not keep unused ui/toast wrapper file", () => {
    const path = resolve(process.cwd(), "src/components/ui/toast.tsx")
    expect(existsSync(path)).toBe(false)
  })
})

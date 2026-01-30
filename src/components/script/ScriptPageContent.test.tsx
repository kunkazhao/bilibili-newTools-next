// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render } from "@testing-library/react"
import { ToastProvider } from "@/components/Toast"
import ScriptPageContent from "@/components/script/ScriptPageContent"

let capturedProps: { url: string } | null = null

vi.mock("@/components/script/ScriptPageView", () => {
  return {
    default: (props: { url: string }) => {
      capturedProps = props
      return null
    },
  }
})

vi.mock("@/components/script/ScriptDialogs", () => {
  return { default: () => null }
})

describe("ScriptPageContent", () => {
  afterEach(() => {
    cleanup()
    localStorage.clear()
    capturedProps = null
  })

  it("does not prefill url from script_prefill_url", async () => {
    localStorage.setItem("script_prefill_url", "BV1xx411c7mD")

    render(
      <ToastProvider>
        <ScriptPageContent />
      </ToastProvider>
    )

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(capturedProps?.url ?? "").toBe("")
  })
})

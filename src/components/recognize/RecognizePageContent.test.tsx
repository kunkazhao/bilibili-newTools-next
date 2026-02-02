// @vitest-environment jsdom

import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, waitFor } from "@testing-library/react"

import RecognizePageContent from "./RecognizePageContent"

const ENTRY_STORAGE_KEY = "image_params_entries"
const showToast = vi.fn()

let viewProps: Record<string, unknown> | null = null

vi.mock("./RecognizePageView", () => ({
  default: (props: Record<string, unknown>) => {
    viewProps = props
    return null
  },
}))

vi.mock("./RecognizeDialogs", () => ({
  default: (props: { progressOpen?: boolean; progressTitle?: string }) => (
    <div>
      {props.progressOpen ? "progress-open" : "progress-closed"}
      {props.progressTitle ? `:${props.progressTitle}` : ""}
    </div>
  ),
}))

vi.mock("@/components/Toast", () => ({
  useToast: () => ({ showToast }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}))

describe("RecognizePageContent local storage", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it("does not overwrite stored entries on mount", async () => {
    const storedEntries = [
      {
        id: "entry-1",
        name: "Sample",
        price: "12",
        image: "data:image/png;base64,abc",
        params: { weight: "1kg" },
      },
    ]
    const storedValue = JSON.stringify(storedEntries)
    localStorage.setItem(ENTRY_STORAGE_KEY, storedValue)

    const setItemSpy = vi.spyOn(Storage.prototype, "setItem")
    setItemSpy.mockClear()

    render(
      <React.StrictMode>
        <RecognizePageContent />
      </React.StrictMode>
    )

    await waitFor(() => {
      expect(setItemSpy).not.toHaveBeenCalledWith(ENTRY_STORAGE_KEY, "[]")
    })
  })

  it("opens progress dialog while processing files", async () => {
    const file = new File(["data"], "sample.png", { type: "image/png" })

    const mockReader = vi.fn()
    class MockFileReader {
      result = "data:image/png;base64,abc"
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      readAsDataURL() {
        mockReader()
        if (this.onload) this.onload()
      }
    }

    Object.defineProperty(window, "FileReader", {
      writable: true,
      value: MockFileReader,
    })

    const fetchSpy = vi.fn(async () => ({
      ok: true,
      json: async () => ({ params: {} }),
    }))
    Object.defineProperty(window, "fetch", {
      writable: true,
      value: fetchSpy,
    })

    render(<RecognizePageContent />)

    await waitFor(() => {
      expect(viewProps).not.toBeNull()
    })

    const input = document.createElement("input")
    Object.defineProperty(input, "files", { value: [file] })
    const event = { target: input } as unknown as React.ChangeEvent<HTMLInputElement>

    if (viewProps?.onInputChange) {
      ;(viewProps.onInputChange as (event: React.ChangeEvent<HTMLInputElement>) => void)(
        event
      )
    }

    await waitFor(() => {
      expect(document.body.textContent).toContain("progress-open")
    })
  })
})

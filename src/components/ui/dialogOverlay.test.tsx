// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"
import {
  Dialog,
  DialogOverlay,
  DialogPortal,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogOverlay,
  AlertDialogPortal,
} from "@/components/ui/alert-dialog"

describe("dialog overlays", () => {
  afterEach(() => {
    cleanup()
    document.body.innerHTML = ""
  })

  it("disables pointer events on closed dialog overlay", () => {
    render(
      <Dialog open>
        <DialogPortal>
          <DialogOverlay />
        </DialogPortal>
      </Dialog>
    )

    const overlay = document.body.querySelector(".fixed.inset-0")
    expect(overlay).toBeTruthy()
    expect(overlay?.className).toContain("data-[state=closed]:pointer-events-none")
  })

  it("disables pointer events on closed alert dialog overlay", () => {
    render(
      <AlertDialog open>
        <AlertDialogPortal>
          <AlertDialogOverlay />
        </AlertDialogPortal>
      </AlertDialog>
    )

    const overlay = document.body.querySelector(".fixed.inset-0")
    expect(overlay).toBeTruthy()
    expect(overlay?.className).toContain("data-[state=closed]:pointer-events-none")
  })
})

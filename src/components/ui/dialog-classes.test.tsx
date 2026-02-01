// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog"
import { FieldSet } from "./field"
import ModalForm from "@/components/ModalForm"

describe("dialog class standards", () => {
  it("applies dialog classes to base components", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogHeader>
          <DialogFooter>Footer</DialogFooter>
        </DialogContent>
      </Dialog>
    )

    const title = screen.getByText("Title")
    const description = screen.getByText("Description")
    const header = title.parentElement
    const footer = screen.getByText("Footer")
    const content = title.closest('[role="dialog"]')

    expect(title.className).toContain("dialog-title")
    expect(description.className).toContain("dialog-description")
    expect(header?.className).toContain("dialog-header")
    expect(footer.className).toContain("dialog-footer")
    expect(content?.className || "").toContain("dialog-content")
  })

  it("applies dialog fieldset and form classes", () => {
    render(
      <>
        <FieldSet data-testid="fieldset" />
        <ModalForm
          isOpen
          title="Test"
          onSubmit={() => {}}
          onOpenChange={() => {}}
        >
          <FieldSet />
        </ModalForm>
      </>
    )

    const fieldset = screen.getByTestId("fieldset")
    expect(fieldset.className).toContain("dialog-fieldset")
    const form = document.querySelector("form")
    expect(form?.className || "").toContain("dialog-form")
  })

  it("applies default modal width for ModalForm", () => {
    render(
      <ModalForm
        isOpen
        title="Test"
        onSubmit={() => {}}
        onOpenChange={() => {}}
      >
        <FieldSet />
      </ModalForm>
    )

    const dialogs = document.querySelectorAll('[role="dialog"]')
    const content = dialogs[dialogs.length - 1] as HTMLElement | undefined
    expect(content?.className || "").toContain("sm:max-w-[560px]")
  })

  it("constrains modal height and makes body scrollable", () => {
    render(
      <ModalForm
        isOpen
        title="Test"
        onSubmit={() => {}}
        onOpenChange={() => {}}
      >
        <FieldSet />
      </ModalForm>
    )

    const dialogs = document.querySelectorAll('[role="dialog"]')
    const content = dialogs[dialogs.length - 1] as HTMLElement | undefined
    expect(content?.className || "").toContain("max-h-[85vh]")
    const body = document.querySelector(".dialog-body")
    expect(body?.className || "").toContain("overflow-y-auto")
  })
})

// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import BenchmarkDialogs from "./BenchmarkDialogs"

const noop = () => {}

describe("BenchmarkDialogs", () => {
  beforeAll(() => {
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    globalThis.ResizeObserver = ResizeObserver
  })

  it("enters edit mode for category rows", async () => {
    const user = userEvent.setup()
    render(
      <BenchmarkDialogs
        subtitleDialog={{
          open: false,
          loading: false,
          text: "",
          onOpenChange: noop,
          onCopy: noop,
        }}
        addDialog={{
          open: false,
          links: "",
          categoryId: "",
          note: "",
          submitting: false,
          categories: [],
          onOpenChange: noop,
          onLinksChange: noop,
          onCategoryChange: noop,
          onNoteChange: noop,
          onSubmit: noop,
        }}
        editDialog={{
          entry: null,
          title: "",
          categoryId: "",
          note: "",
          submitting: false,
          categories: [],
          onClose: noop,
          onTitleChange: noop,
          onCategoryChange: noop,
          onNoteChange: noop,
          onSubmit: noop,
        }}
        categoryDialog={{
          open: true,
          input: "",
          submitting: false,
          updatingId: "",
          categories: [{ id: "cat-1", name: "分类A" }],
          onOpenChange: noop,
          onInputChange: noop,
          onSubmit: noop,
          onUpdateName: noop,
          onRequestDelete: noop,
        }}
        confirmDialogs={{
          entry: null,
          category: null,
          onEntryCancel: noop,
          onCategoryCancel: noop,
          onEntryConfirm: noop,
          onCategoryConfirm: noop,
        }}
      />
    )

    const dialog = screen.getAllByRole("dialog").slice(-1)[0]
    const scope = within(dialog)
    await user.click(scope.getByLabelText("Edit benchmark category"))
    expect(scope.getByLabelText("Confirm edit")).toBeTruthy()
    expect(scope.getByLabelText("Cancel edit")).toBeTruthy()
  })
})

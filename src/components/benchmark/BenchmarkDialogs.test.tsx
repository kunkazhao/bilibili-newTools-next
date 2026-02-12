// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import BenchmarkDialogs from "./BenchmarkDialogs"

const noop = vi.fn()

describe("BenchmarkDialogs", () => {
  it("renders delete confirm dialog when entry exists", () => {
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
        confirmDialogs={{
          entry: { id: "entry-1", title: "A" },
          onEntryCancel: noop,
          onEntryConfirm: noop,
        }}
      />
    )

    expect(screen.getByText("删除对标视频")).toBeTruthy()
    expect(screen.getByText("确认删除")).toBeTruthy()
  })
})

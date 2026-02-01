// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import BenchmarkDialogs from "./BenchmarkDialogs"
import type { BenchmarkCategory, BenchmarkEntry } from "@/components/benchmark/types"

const baseProps = {
  subtitleDialog: {
    open: false,
    loading: false,
    text: "",
    onOpenChange: vi.fn(),
    onCopy: vi.fn(),
  },
  addDialog: {
    open: false,
    links: "",
    categoryId: "",
    note: "",
    submitting: false,
    categories: [] as BenchmarkCategory[],
    onOpenChange: vi.fn(),
    onLinksChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onNoteChange: vi.fn(),
    onSubmit: vi.fn(),
  },
  editDialog: {
    entry: null as BenchmarkEntry | null,
    title: "",
    categoryId: "",
    note: "",
    submitting: false,
    categories: [] as BenchmarkCategory[],
    onClose: vi.fn(),
    onTitleChange: vi.fn(),
    onCategoryChange: vi.fn(),
    onNoteChange: vi.fn(),
    onSubmit: vi.fn(),
  },
  categoryDialog: {
    open: false,
    input: "",
    submitting: false,
    updatingId: null as string | null,
    categories: [] as BenchmarkCategory[],
    onOpenChange: vi.fn(),
    onInputChange: vi.fn(),
    onSubmit: vi.fn(),
    onUpdateName: vi.fn(),
    onRequestDelete: vi.fn(),
  },
  confirmDialogs: {
    entry: null as BenchmarkEntry | null,
    category: null as BenchmarkCategory | null,
    onEntryCancel: vi.fn(),
    onCategoryCancel: vi.fn(),
    onEntryConfirm: vi.fn(),
    onCategoryConfirm: vi.fn(),
  },
}

describe("BenchmarkDialogs", () => {
  it("uses scroll area for category list", () => {
    const categories: BenchmarkCategory[] = [
      { id: "c1", name: "Category-A" },
      { id: "c2", name: "Category-B" },
    ]

    render(
      <BenchmarkDialogs
        {...baseProps}
        categoryDialog={{
          ...baseProps.categoryDialog,
          open: true,
          categories,
        }}
      />
    )

    const list = document.querySelector(".dialog-list")
    expect(list?.getAttribute("data-dialog-scroll")).toBe("true")
  })
})

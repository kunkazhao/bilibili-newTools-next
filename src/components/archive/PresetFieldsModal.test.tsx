// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import PresetFieldsModal from "./PresetFieldsModal"
import type { CategoryItem } from "./types"

describe("PresetFieldsModal", () => {
  it("renders drag handles for preset field rows", () => {
    const categories: CategoryItem[] = [
      {
        id: "cat-1",
        name: "Category",
        sortOrder: 10,
        specFields: [{ key: "Param-A" }],
      },
    ]

    render(
      <PresetFieldsModal
        isOpen
        categories={categories}
        selectedCategoryId="cat-1"
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    )

    const handles = screen.getAllByLabelText("Drag handle")
    expect(handles.length).toBeGreaterThan(0)
  })
})

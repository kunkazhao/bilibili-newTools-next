// @vitest-environment jsdom
import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PresetFieldsModal from "./PresetFieldsModal"
import type { CategoryItem } from "./types"

describe("PresetFieldsModal", () => {
  beforeAll(() => {
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    globalThis.ResizeObserver = ResizeObserver
  })

  it("renders drag handles for preset field rows", () => {
    const categories: CategoryItem[] = [
      {
        id: "cat-1",
        name: "Category",
        sortOrder: 10,
        specFields: [{ key: "Param-A" }],
        parentId: "parent-1",
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

  it("uses scroll area for preset list", () => {
    const categories: CategoryItem[] = [
      {
        id: "cat-1",
        name: "Category",
        sortOrder: 10,
        specFields: [{ key: "Param-A" }],
        parentId: "parent-1",
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

    const list = document.querySelector(".dialog-list")
    expect(list?.getAttribute("data-dialog-scroll")).toBe("true")
  })

  it("enters edit mode from the edit icon", async () => {
    const user = userEvent.setup()
    const categories: CategoryItem[] = [
      {
        id: "cat-1",
        name: "Category",
        sortOrder: 10,
        specFields: [{ key: "Param-A", example: "Example" }],
        parentId: "parent-1",
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

    const dialog = screen.getAllByRole("dialog").slice(-1)[0]
    const scope = within(dialog)
    await user.click(scope.getByLabelText("Edit preset field"))
    expect(scope.getByLabelText("Confirm edit")).toBeTruthy()
    expect(scope.getByLabelText("Cancel edit")).toBeTruthy()
  })
})

// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CategoryManagerModal from "./CategoryManagerModal"
import type { CategoryItem } from "./types"

describe("CategoryManagerModal", () => {
  beforeAll(() => {
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    globalThis.ResizeObserver = ResizeObserver
  })

  it("uses scroll area for list container", () => {
    const categories: CategoryItem[] = [
      { id: "1", name: "A", sortOrder: 10 },
      { id: "2", name: "B", sortOrder: 20 },
    ]

    render(
      <CategoryManagerModal
        isOpen
        categories={categories}
        onClose={() => {}}
        onSave={() => {}}
      />
    )

    const list = document.querySelector(".dialog-list")
    expect(list?.getAttribute("data-dialog-scroll")).toBe("true")
  })

  it("renders delete buttons as icons", () => {
    const categories: CategoryItem[] = [
      { id: "1", name: "A", sortOrder: 10 },
    ]

    render(
      <CategoryManagerModal
        isOpen
        categories={categories}
        onClose={() => {}}
        onSave={() => {}}
      />
    )

    const actionButton = document.querySelector(
      'button[aria-label="Delete parent category"]'
    )
    expect(actionButton).not.toBeNull()
    expect(actionButton?.querySelector("svg")).not.toBeNull()
  })

  it("renders add buttons as icons", () => {
    const categories: CategoryItem[] = [
      { id: "1", name: "A", sortOrder: 10 },
    ]

    render(
      <CategoryManagerModal
        isOpen
        categories={categories}
        onClose={() => {}}
        onSave={() => {}}
      />
    )

    const addParentButton = document.querySelector(
      'button[aria-label="Add parent category"]'
    )
    const addChildButton = document.querySelector(
      'button[aria-label="Add child category"]'
    )
    expect(addParentButton).not.toBeNull()
    expect(addParentButton?.querySelector("svg")).not.toBeNull()
    expect(addChildButton).not.toBeNull()
    expect(addChildButton?.querySelector("svg")).not.toBeNull()
  })

  it("uses xl modal width for the category manager", () => {
    const categories: CategoryItem[] = [
      { id: "1", name: "A", sortOrder: 10 },
    ]

    render(
      <CategoryManagerModal
        isOpen
        categories={categories}
        onClose={() => {}}
        onSave={() => {}}
      />
    )

    const dialog = document.querySelector(".dialog-content")
    expect(dialog?.className || "").toContain("sm:max-w-[900px]")
  })

  it("switches to edit mode from the edit icon", async () => {
    const user = userEvent.setup()
    const categories: CategoryItem[] = [
      { id: "1", name: "数码", sortOrder: 10 },
      { id: "2", name: "鼠标", sortOrder: 20, parentId: "1" },
    ]

    render(
      <CategoryManagerModal
        isOpen
        categories={categories}
        onClose={() => {}}
        onSave={() => {}}
      />
    )

    const dialog = screen.getAllByRole("dialog").slice(-1)[0]
    const scope = within(dialog)
    await user.click(scope.getByLabelText("Edit parent category"))
    expect(scope.getByLabelText("Confirm edit")).toBeTruthy()
    expect(scope.getByLabelText("Cancel edit")).toBeTruthy()
  })
})

// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import CategoryManagerModal from "./CategoryManagerModal"
import type { CategoryItem } from "./types"

describe("CategoryManagerModal", () => {
  it("uses dialog list container for scrollable height", () => {
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
    expect(list).not.toBeNull()
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

    const actionButton = document.querySelector('button[aria-label="Delete category"]')
    expect(actionButton).not.toBeNull()
    expect(actionButton?.querySelector("svg")).not.toBeNull()
  })
})

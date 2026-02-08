// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CategoryHierarchy from "./CategoryHierarchy"

const categories = [
  { id: "p1", name: "Parent 1", sortOrder: 0 },
  { id: "p2", name: "Parent 2", sortOrder: 1 },
  { id: "c1", name: "Child 1", parentId: "p1", sortOrder: 0, count: 2 },
  { id: "c2", name: "Child 2", parentId: "p2", sortOrder: 0, count: 0 },
]

describe("CategoryHierarchy", () => {
  afterEach(() => {
    cleanup()
  })

  it("supports single open and collapsible parents", async () => {
    const user = userEvent.setup()
    const onParentSelect = vi.fn()
    const onCategorySelect = vi.fn()

    render(
      <CategoryHierarchy
        title="Categories"
        categories={categories}
        activeParentId="p1"
        activeCategoryId="c1"
        onParentSelect={onParentSelect}
        onCategorySelect={onCategorySelect}
        showChildCount
        isLoading={false}
      />
    )

    expect(screen.getByRole("button", { name: /Child 1/ })).toBeTruthy()

    await user.click(screen.getByRole("button", { name: "Parent 2" }))
    expect(onParentSelect).toHaveBeenCalledWith("p2")
    expect(screen.getByRole("button", { name: /Child 2/ })).toBeTruthy()

    await user.click(screen.getByRole("button", { name: "Parent 2" }))
    expect(screen.queryByRole("button", { name: /Child 2/ })).toBeNull()
  })
})

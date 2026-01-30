// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { Trash2 } from "lucide-react"
import EditableListRow from "./editable-list-row"

describe("EditableListRow", () => {
  it("renders icon action content when provided", () => {
    render(
      <EditableListRow
        value="Item"
        actionAriaLabel="Delete item"
        actionContent={<Trash2 className="h-4 w-4" />}
      />
    )

    const actionButton = screen.getByLabelText("Delete item")
    expect(actionButton.querySelector("svg")).not.toBeNull()
  })
})

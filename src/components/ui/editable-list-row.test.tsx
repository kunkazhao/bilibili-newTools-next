// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import EditableListRow from "./editable-list-row"

describe("EditableListRow", () => {
  it("renders edit and delete actions in view mode", () => {
    render(
      <EditableListRow
        viewContent={<div>Item</div>}
        editContent={<div>Edit</div>}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    )

    const row = screen.getByText("Item").closest(".modal-list-row")
    expect(row).toBeTruthy()
    expect(row?.className || "").toContain("min-w-0")

    const editButton = screen.getByLabelText("Edit item")
    const deleteButton = screen.getByLabelText("Delete item")

    expect(editButton).toBeTruthy()
    expect(deleteButton).toBeTruthy()
    expect(editButton.className).toContain("shrink-0")
    expect(deleteButton.className).toContain("shrink-0")
  })

  it("renders confirm and cancel actions in edit mode", () => {
    render(
      <EditableListRow
        editing
        viewContent={<div>Item</div>}
        editContent={<div>Edit</div>}
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )

    const confirmButton = screen.getByLabelText("Confirm edit")
    const cancelButton = screen.getByLabelText("Cancel edit")

    expect(confirmButton).toBeTruthy()
    expect(cancelButton).toBeTruthy()
    expect(confirmButton.className).toContain("shrink-0")
    expect(cancelButton.className).toContain("shrink-0")
  })
})

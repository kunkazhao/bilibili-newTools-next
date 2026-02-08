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

    expect(screen.getByLabelText("Edit item")).toBeTruthy()
    expect(screen.getByLabelText("Delete item")).toBeTruthy()
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

    expect(screen.getByLabelText("Confirm edit")).toBeTruthy()
    expect(screen.getByLabelText("Cancel edit")).toBeTruthy()
  })
})

// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import CommentBlueLinkDialogs from "./CommentBlueLinkDialogs"

const baseProps = {
  modalOpen: true,
  editing: false,
  accounts: [{ id: "a1", name: "Account" }],
  formAccountId: "a1",
  formName: "",
  formSourceLink: "",
  formContent: "",
  formRemark: "",
  extracting: false,
  onModalOpenChange: vi.fn(),
  onAccountChange: vi.fn(),
  onNameChange: vi.fn(),
  onSourceLinkChange: vi.fn(),
  onContentChange: vi.fn(),
  onRemarkChange: vi.fn(),
  onExtract: vi.fn(),
  onSave: vi.fn(),
}

describe("CommentBlueLinkDialogs", () => {
  it("does not render category field", () => {
    render(<CommentBlueLinkDialogs {...baseProps} />)

    expect(screen.queryByText("·ÖÀà")).toBeNull()
    expect(screen.queryByLabelText("Select category")).toBeNull()
  })
})

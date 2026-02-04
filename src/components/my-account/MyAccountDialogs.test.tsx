// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import MyAccountDialogs from "./MyAccountDialogs"

const baseProps = {
  accountModalOpen: true,
  accountNameInput: "",
  accountLinkInput: "",
  accounts: [
    {
      id: "a1",
      name: "小江",
      homepage_link: "https://space.bilibili.com/123",
    },
  ],
  onAccountNameChange: () => {},
  onAccountLinkChange: () => {},
  onAccountSubmit: () => {},
  onAccountOpenChange: () => {},
  onAccountNameBlur: () => {},
  onAccountLinkBlur: () => {},
  onAccountDelete: () => {},
}

describe("MyAccountDialogs", () => {
  it("keeps new and existing account inputs on a single row", () => {
    render(<MyAccountDialogs {...baseProps} />)

    const nameInputs = screen.getAllByLabelText("Account name")
    const linkInputs = screen.getAllByLabelText("Homepage link")

    expect(nameInputs.length).toBe(2)
    expect(linkInputs.length).toBe(2)

    const newRow = nameInputs[0].parentElement
    expect(newRow).toBeTruthy()
    expect(newRow?.contains(linkInputs[0])).toBe(true)
    expect(within(newRow as HTMLElement).getByRole("button", { name: "新增" })).toBeTruthy()

    const existingRow = nameInputs[1].parentElement
    expect(existingRow).toBeTruthy()
    expect(existingRow?.className || "").toContain("modal-list-row")
    expect(existingRow?.contains(linkInputs[1])).toBe(true)
    expect(within(existingRow as HTMLElement).getByLabelText("Delete account")).toBeTruthy()
  })
})

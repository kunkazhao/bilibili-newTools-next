// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest"
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
  beforeAll(() => {
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    globalThis.ResizeObserver = ResizeObserver
  })

  it("keeps new and existing account inputs on a single row", () => {
    render(<MyAccountDialogs {...baseProps} />)

    const nameInputs = screen.getAllByLabelText("Account name")
    const linkInputs = screen.getAllByLabelText("Homepage link")

    expect(nameInputs.length).toBe(1)
    expect(linkInputs.length).toBe(1)

    const newRow = nameInputs[0].parentElement
    expect(newRow).toBeTruthy()
    expect(newRow?.contains(linkInputs[0])).toBe(true)
    expect(within(newRow as HTMLElement).getByRole("button", { name: "新增" })).toBeTruthy()

    const existingRow = screen.getByText("小江").closest(".modal-list-row")
    expect(existingRow).toBeTruthy()
    expect(existingRow?.className || "").toContain("modal-list-row")
    expect(within(existingRow as HTMLElement).getByLabelText("Edit account")).toBeTruthy()
    expect(within(existingRow as HTMLElement).getByLabelText("Delete account")).toBeTruthy()
  })
})

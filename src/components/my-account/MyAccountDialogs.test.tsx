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
    const addButton = within(newRow as HTMLElement).getByRole("button", { name: "新增" })
    expect(addButton).toBeTruthy()
    expect(addButton.className).toContain("shrink-0")

    const existingRow = screen.getByText("小江").closest(".modal-list-row")
    expect(existingRow).toBeTruthy()
    expect(existingRow?.className || "").toContain("modal-list-row")
    expect(within(existingRow as HTMLElement).getByLabelText("Edit account")).toBeTruthy()
    expect(within(existingRow as HTMLElement).getByLabelText("Delete account")).toBeTruthy()
  })

  it("keeps long homepage text truncated and action buttons visible", () => {
    render(
      <MyAccountDialogs
        {...baseProps}
        accounts={[
          {
            id: "a2",
            name: "超长账号名称",
            homepage_link:
              "https://space.bilibili.com/1234567890123456789012345678901234567890",
          },
        ]}
      />
    )

    const existingRow = screen.getByText("超长账号名称").closest(".modal-list-row")
    expect(existingRow).toBeTruthy()

    const fields = existingRow?.querySelectorAll(".modal-list-field")
    expect(fields?.length).toBeGreaterThanOrEqual(2)
    expect(fields?.[1].className || "").toContain("truncate")

    const editButton = within(existingRow as HTMLElement).getByLabelText("Edit account")
    const deleteButton = within(existingRow as HTMLElement).getByLabelText("Delete account")
    expect(editButton.className).toContain("shrink-0")
    expect(deleteButton.className).toContain("shrink-0")
  })
})

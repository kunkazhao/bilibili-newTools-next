// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import BlueLinkMapDialogs from "./BlueLinkMapDialogs"
import type { BlueLinkAccount, BlueLinkCategory, ProgressFailure, SourcingItem } from "./types"

const baseProps = {
  editOpen: false,
  editLink: "",
  onEditLinkChange: vi.fn(),
  onEditOpenChange: vi.fn(),
  onEditSubmit: vi.fn(),

  importOpen: false,
  importText: "",
  importing: false,
  onImportTextChange: vi.fn(),
  onImportOpenChange: vi.fn(),
  onImportSubmit: vi.fn(),

  accountModalOpen: false,
  accountNameInput: "",
  accounts: [] as BlueLinkAccount[],
  onAccountNameChange: vi.fn(),
  onAccountSubmit: vi.fn(),
  onAccountOpenChange: vi.fn(),
  onAccountNameBlur: vi.fn(),
  onAccountDelete: vi.fn(),
  onAccountReorder: vi.fn(),

  categoryModalOpen: false,
  categoryNameInput: "",
  categoryError: "",
  categories: [] as BlueLinkCategory[],
  activeAccountId: "acc-1",
  onCategoryNameChange: vi.fn(),
  onCategorySubmit: vi.fn(),
  onCategoryOpenChange: vi.fn(),
  onCategoryNameBlur: vi.fn(),
  onCategoryAddFromOther: vi.fn(),
  onCategoryDelete: vi.fn(),
  onCategoryReorder: vi.fn(),

  pickerOpen: false,
  pickerKeyword: "",
  pickerCategoryId: "",
  pickerItems: [] as SourcingItem[],
  pickerHasMore: false,
  pickerLoading: false,
  onPickerKeywordChange: vi.fn(),
  onPickerCategoryChange: vi.fn(),
  onPickerOpenChange: vi.fn(),
  onPickerPick: vi.fn(),
  onPickerLoadMore: vi.fn(),

  progressOpen: false,
  progressLabel: "",
  progressTotal: 0,
  progressProcessed: 0,
  progressSuccess: 0,
  progressFailures: [] as ProgressFailure[],
  progressCancelled: false,
  progressRunning: false,
  onProgressOpenChange: vi.fn(),
  onProgressCancel: vi.fn(),
  onProgressClose: vi.fn(),

  confirmOpen: false,
  confirmTitle: "",
  confirmDescription: "",
  confirmActionLabel: "Confirm",
  onConfirmOpenChange: vi.fn(),
  onConfirmAction: vi.fn(),
}

describe("BlueLinkMapDialogs", () => {
  it("shows editable current categories and add actions for other accounts", () => {
    const categories: BlueLinkCategory[] = [
      { id: "c1", name: "Category-A", account_id: "acc-1" },
      { id: "c2", name: "Category-B", account_id: "acc-2" },
    ]

    render(
      <BlueLinkMapDialogs
        {...baseProps}
        categoryModalOpen
        categories={categories}
      />
    )

    expect(screen.getByDisplayValue("Category-A")).not.toBeNull()
    expect(screen.getByLabelText("Delete category")).not.toBeNull()
    expect(screen.getByLabelText("Add category")).not.toBeNull()
  })

  it("renders category filter selector in picker dialog", () => {
    const categories: BlueLinkCategory[] = [
      { id: "c1", name: "Category-A", account_id: "acc-1" },
    ]

    render(
      <BlueLinkMapDialogs
        {...baseProps}
        pickerOpen
        pickerCategoryId="c1"
        categories={categories}
      />
    )

    expect(screen.getByLabelText("Category filter")).not.toBeNull()
  })

  it("shows drag handles for account and category rows", () => {
    const accounts: BlueLinkAccount[] = [{ id: "acc-1", name: "Account-A" }]
    const categories: BlueLinkCategory[] = [
      { id: "c1", name: "Category-A", account_id: "acc-1" },
    ]

    render(
      <BlueLinkMapDialogs
        {...baseProps}
        accountModalOpen
        categoryModalOpen
        accounts={accounts}
        categories={categories}
      />
    )

    const handles = screen.getAllByLabelText("Drag handle")
    expect(handles.length).toBeGreaterThanOrEqual(2)
  })

  it("uses scroll area for account list", () => {
    const accounts: BlueLinkAccount[] = [
      { id: "acc-1", name: "Account-A" },
      { id: "acc-2", name: "Account-B" },
    ]

    render(
      <BlueLinkMapDialogs
        {...baseProps}
        accountModalOpen
        accounts={accounts}
      />
    )

    const list = document.querySelector(".dialog-list")
    expect(list?.getAttribute("data-dialog-scroll")).toBe("true")
  })

  it("renders progress dialog summary", () => {
    render(
      <BlueLinkMapDialogs
        {...baseProps}
        progressOpen
        progressLabel="映射"
        progressTotal={10}
        progressProcessed={5}
        progressSuccess={4}
        progressFailures={[{ link: "", name: "未识别SKU", reason: "商品无法匹配" }]}
        progressRunning
      />
    )

    expect(screen.getByText("映射进度")).not.toBeNull()
    expect(screen.getByText("50%")).not.toBeNull()
    expect(screen.getByText("10个商品 · 1个失败")).not.toBeNull()
    expect(screen.getByRole("button", { name: "取消" })).not.toBeNull()
  })
})

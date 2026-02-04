// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import BlueLinkMapDialogs from "./BlueLinkMapDialogs"

const baseProps = {
  editOpen: true,
  editLink: "",
  editRemark: "",
  onEditLinkChange: vi.fn(),
  onEditRemarkChange: vi.fn(),
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
  accounts: [],
  onAccountNameChange: vi.fn(),
  onAccountSubmit: vi.fn(),
  onAccountOpenChange: vi.fn(),
  onAccountNameBlur: vi.fn(),
  onAccountDelete: vi.fn(),
  onAccountReorder: vi.fn(),
  categoryModalOpen: false,
  categoryNameInput: "",
  categoryError: "",
  categories: [],
  activeAccountId: null,
  onCategoryNameChange: vi.fn(),
  onCategorySubmit: vi.fn(),
  onCategoryOpenChange: vi.fn(),
  onCategoryNameBlur: vi.fn(),
  onCategoryAddFromOther: vi.fn(),
  onCategoryDelete: vi.fn(),
  onCategoryReorder: vi.fn(),
  pickerOpen: false,
  pickerCategoryId: "",
  pickerItems: [],
  pickerHasMore: false,
  pickerLoading: false,
  onPickerCategoryChange: vi.fn(),
  onPickerOpenChange: vi.fn(),
  onPickerPick: vi.fn(),
  onPickerLoadMore: vi.fn(),
  progressOpen: false,
  progressLabel: "",
  progressTotal: 0,
  progressProcessed: 0,
  progressSuccess: 0,
  progressFailures: [],
  progressCancelled: false,
  progressRunning: false,
  onProgressOpenChange: vi.fn(),
  onProgressCancel: vi.fn(),
  onProgressClose: vi.fn(),
  confirmOpen: false,
  confirmTitle: "",
  confirmDescription: "",
  confirmActionLabel: "",
  onConfirmOpenChange: vi.fn(),
  onConfirmAction: vi.fn(),
}

describe("BlueLinkMapDialogs", () => {
  it("renders edit dialog inputs", () => {
    render(<BlueLinkMapDialogs {...baseProps} />)
    expect(screen.getByPlaceholderText("请输入蓝链")).not.toBeNull()
    expect(screen.getByPlaceholderText("请输入备注")).not.toBeNull()
  })
})

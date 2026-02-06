// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import ArchivePageContent from "./ArchivePageContent"

let lastViewProps: any = null

vi.mock("./ArchivePageView", () => ({
  default: (props: any) => {
    lastViewProps = props
    return null
  },
}))

vi.mock("./ArchiveDialogs", () => ({
  default: () => null,
}))

vi.mock("@/components/Toast", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogAction: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const mockFetchCategories = vi.fn()
const mockFetchCategoryCounts = vi.fn()
const mockFetchItems = vi.fn()
const mockCreateCategory = vi.fn()
const mockUpdateCategory = vi.fn()
const mockDeleteCategory = vi.fn()
const mockCreateItem = vi.fn()
const mockUpdateItem = vi.fn()
const mockDeleteItem = vi.fn()
const mockUploadCoverByUid = vi.fn()

vi.mock("./archiveApi", () => ({
  fetchCategories: (...args: unknown[]) => mockFetchCategories(...args),
  fetchCategoryCounts: (...args: unknown[]) => mockFetchCategoryCounts(...args),
  fetchItems: (...args: unknown[]) => mockFetchItems(...args),
  createCategory: (...args: unknown[]) => mockCreateCategory(...args),
  updateCategory: (...args: unknown[]) => mockUpdateCategory(...args),
  deleteCategory: (...args: unknown[]) => mockDeleteCategory(...args),
  createItem: (...args: unknown[]) => mockCreateItem(...args),
  updateItem: (...args: unknown[]) => mockUpdateItem(...args),
  deleteItem: (...args: unknown[]) => mockDeleteItem(...args),
  uploadCoverByUid: (...args: unknown[]) => mockUploadCoverByUid(...args),
}))

describe("ArchivePageContent replace cover", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastViewProps = null
  })

  it("skips conflicting UID uploads", async () => {
    mockFetchCategories.mockResolvedValueOnce({
      categories: [
        { id: "cat-1", name: "Category 1", sort_order: 0, spec_fields: [] },
      ],
    })
    mockFetchCategoryCounts.mockResolvedValueOnce({ counts: {} })
    mockFetchItems.mockResolvedValue({
      items: [],
      has_more: false,
      next_offset: 0,
    })
    mockUploadCoverByUid.mockResolvedValue({ success: true })

    render(<ArchivePageContent />)

    await waitFor(() => expect(lastViewProps).toBeTruthy())

    const fileA = new File(["a"], "SB001-test.jpg", { type: "image/jpeg" })
    const fileB = new File(["b"], "SB001-dup.jpg", { type: "image/jpeg" })
    const fileC = new File(["c"], "SB002-test.jpg", { type: "image/jpeg" })

    lastViewProps.onOpenReplaceCover()

    const input = await waitFor(() => {
      const element = document.getElementById("replace-cover-input") as
        | HTMLInputElement
        | null
      if (!element) throw new Error("input not ready")
      return element
    })
    fireEvent.change(input, { target: { files: [fileA, fileB, fileC] } })
    const submitButton = await waitFor(() => {
      const element = document.querySelector("button[type=\"submit\"]") as
        | HTMLButtonElement
        | null
      if (!element) throw new Error("submit not ready")
      return element
    })
    fireEvent.click(submitButton)

    await waitFor(() => expect(mockUploadCoverByUid).toHaveBeenCalledTimes(1))
    expect(mockUploadCoverByUid).toHaveBeenCalledWith("SB002", fileC)
  })

  it("extracts UID from filename prefix without delimiter", async () => {
    mockFetchCategories.mockResolvedValueOnce({
      categories: [
        { id: "cat-1", name: "Category 1", sort_order: 0, spec_fields: [] },
      ],
    })
    mockFetchCategoryCounts.mockResolvedValueOnce({ counts: {} })
    mockFetchItems.mockResolvedValue({
      items: [],
      has_more: false,
      next_offset: 0,
    })
    mockUploadCoverByUid.mockResolvedValue({ success: true })

    render(<ArchivePageContent />)

    await waitFor(() => expect(lastViewProps).toBeTruthy())

    const fileA = new File(["a"], "LY003TestZ60S.jpg", { type: "image/jpeg" })

    lastViewProps.onOpenReplaceCover()

    const input = await waitFor(() => {
      const element = document.getElementById("replace-cover-input") as
        | HTMLInputElement
        | null
      if (!element) throw new Error("input not ready")
      return element
    })
    fireEvent.change(input, { target: { files: [fileA] } })
    const submitButton = await waitFor(() => {
      const element = document.querySelector("button[type=\"submit\"]") as
        | HTMLButtonElement
        | null
      if (!element) throw new Error("submit not ready")
      return element
    })
    fireEvent.click(submitButton)

    await waitFor(() => expect(mockUploadCoverByUid).toHaveBeenCalledTimes(1))
    expect(mockUploadCoverByUid).toHaveBeenCalledWith("LY003", fileA)
  })

  it("extracts UID when filename includes letters after digits before whitespace", async () => {
    mockFetchCategories.mockResolvedValueOnce({
      categories: [
        { id: "cat-1", name: "Category 1", sort_order: 0, spec_fields: [] },
      ],
    })
    mockFetchCategoryCounts.mockResolvedValueOnce({ counts: {} })
    mockFetchItems.mockResolvedValue({
      items: [],
      has_more: false,
      next_offset: 0,
    })
    mockUploadCoverByUid.mockResolvedValue({ success: true })

    render(<ArchivePageContent />)

    await waitFor(() => expect(lastViewProps).toBeTruthy())

    const fileA = new File(["a"], "LY010JBL X.jpg", { type: "image/jpeg" })

    lastViewProps.onOpenReplaceCover()

    const input = await waitFor(() => {
      const element = document.getElementById("replace-cover-input") as
        | HTMLInputElement
        | null
      if (!element) throw new Error("input not ready")
      return element
    })
    fireEvent.change(input, { target: { files: [fileA] } })
    const submitButton = await waitFor(() => {
      const element = document.querySelector("button[type=\"submit\"]") as
        | HTMLButtonElement
        | null
      if (!element) throw new Error("submit not ready")
      return element
    })
    fireEvent.click(submitButton)

    await waitFor(() => expect(mockUploadCoverByUid).toHaveBeenCalledTimes(1))
    expect(mockUploadCoverByUid).toHaveBeenCalledWith("LY010", fileA)
  })
})

// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest"
import { render, waitFor } from "@testing-library/react"

import ArchivePageContent from "./ArchivePageContent"

vi.mock("./ArchivePageView", () => ({
  default: () => null,
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
}))

describe("ArchivePageContent category loading", () => {
  it("does not refetch categories after counts update", async () => {
    mockFetchCategories.mockResolvedValueOnce({
      categories: [
        { id: "cat-1", name: "Category 1", sort_order: 0, spec_fields: [] },
      ],
    })
    mockFetchCategoryCounts.mockResolvedValueOnce({ counts: { "cat-1": 2 } })
    mockFetchItems.mockResolvedValue({
      items: [],
      has_more: false,
      next_offset: 0,
    })

    render(<ArchivePageContent />)

    await waitFor(() => expect(mockFetchCategories).toHaveBeenCalledTimes(1))

    await new Promise((resolve) => setTimeout(resolve, 600))

    expect(mockFetchCategories).toHaveBeenCalledTimes(1)
  })
})

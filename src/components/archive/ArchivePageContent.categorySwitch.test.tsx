// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest"
import { render, waitFor } from "@testing-library/react"

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

describe("ArchivePageContent category switching", () => {
  it("keeps latest category items when requests resolve out of order", async () => {
    mockFetchCategories.mockResolvedValueOnce({
      categories: [
        { id: "parent-1", name: "一级分类", sort_order: 0, spec_fields: [], parent_id: null },
        { id: "cat-a", name: "分类A", sort_order: 0, spec_fields: [], parent_id: "parent-1" },
        { id: "cat-b", name: "分类B", sort_order: 1, spec_fields: [], parent_id: "parent-1" },
      ],
    })
    mockFetchCategoryCounts.mockResolvedValueOnce({ counts: {} })

    localStorage.clear()

    const pending: Array<{ categoryId?: string; resolve: (value: any) => void }> = []
    mockFetchItems.mockImplementation((params: { categoryId?: string }) => {
      return new Promise((resolve) => {
        pending.push({ categoryId: params?.categoryId, resolve })
      })
    })

    render(<ArchivePageContent />)

    await waitFor(() => expect(mockFetchCategories).toHaveBeenCalledTimes(1))

    await waitFor(() =>
      expect(pending.some((entry) => entry.categoryId === "cat-a")).toBe(true)
    )

    const allRequest = pending.find((entry) => !entry.categoryId)
    if (allRequest) {
      allRequest.resolve({ items: [], has_more: false, next_offset: 0 })
    }

    lastViewProps.onSelectCategory("cat-b")

    await waitFor(() =>
      expect(pending.some((entry) => entry.categoryId === "cat-b")).toBe(true)
    )

    await waitFor(() => expect(lastViewProps.isListLoading).toBe(true))

    const catARequest = pending.find((entry) => entry.categoryId === "cat-a")
    const catBRequest = pending.find((entry) => entry.categoryId === "cat-b")

    if (!catARequest || !catBRequest) {
      throw new Error("Missing category requests")
    }

    catBRequest.resolve({
      items: [
        {
          id: "item-b",
          category_id: "cat-b",
          title: "商品B",
          price: 100,
          commission: 10,
          commission_rate: 10,
          spec: {},
        },
      ],
      has_more: false,
      next_offset: 1,
    })

    await waitFor(() => expect(lastViewProps.items[0].id).toBe("item-b"))

    const cacheKeys = Object.keys(localStorage)
    expect(cacheKeys.some((key) => key.startsWith("list:archive-items:"))).toBe(true)

    catARequest.resolve({
      items: [],
      has_more: false,
      next_offset: 0,
    })

    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(lastViewProps.items[0].id).toBe("item-b")
  })
})

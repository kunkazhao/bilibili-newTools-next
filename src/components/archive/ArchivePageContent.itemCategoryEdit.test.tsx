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

describe("ArchivePageContent item category edit", () => {
  it("refreshes left category counts after item category changes", async () => {
    mockFetchCategories.mockResolvedValueOnce({
      categories: [
        { id: "parent-1", name: "????", sort_order: 0, spec_fields: [], parent_id: null },
        { id: "cat-a", name: "??A", sort_order: 0, spec_fields: [], parent_id: "parent-1" },
        { id: "cat-b", name: "??B", sort_order: 1, spec_fields: [], parent_id: "parent-1" },
      ],
    })
    mockFetchCategoryCounts
      .mockResolvedValueOnce({ counts: { "cat-a": 1, "cat-b": 0 } })
      .mockResolvedValueOnce({ counts: { "cat-a": 0, "cat-b": 1 } })
    mockFetchItems.mockResolvedValue({
      items: [
        {
          id: "item-1",
          category_id: "cat-a",
          title: "??1",
          price: 10,
          commission: 1,
          commission_rate: 10,
          spec: {},
        },
      ],
      has_more: false,
      next_offset: 0,
    })

    mockUpdateItem.mockResolvedValue({
      item: {
        id: "item-1",
        category_id: "cat-b",
        title: "??1",
        price: 10,
        commission: 1,
        commission_rate: 10,
        spec: {},
      },
    })

    render(<ArchivePageContent />)

    await waitFor(() => expect(lastViewProps?.items?.length).toBe(1))

    lastViewProps.onSelectCategory("cat-a")

    await waitFor(() => expect(lastViewProps.activeCategoryId).toBe("cat-a"))
    lastViewProps.onEdit("item-1")

    await waitFor(() => expect(lastViewProps?.productFormInitialValues).toBeTruthy())

    const nextValues = {
      ...lastViewProps.productFormInitialValues,
      categoryId: "cat-b",
    }

    await lastViewProps.onSubmitProductForm(nextValues)

    await waitFor(() => {
      expect(mockUpdateItem).toHaveBeenCalledWith(
        "item-1",
        expect.objectContaining({ category_id: "cat-b" })
      )
    })

    await waitFor(() => expect(lastViewProps.items).toHaveLength(0))

    await waitFor(() => {
      expect(mockFetchCategoryCounts).toHaveBeenLastCalledWith({ force: true })
    })

    await waitFor(() => {
      const catA = lastViewProps.categories.find((item: any) => item.id === "cat-a")
      const catB = lastViewProps.categories.find((item: any) => item.id === "cat-b")
      expect(catA?.count).toBe(0)
      expect(catB?.count).toBe(1)
    })
  })
})

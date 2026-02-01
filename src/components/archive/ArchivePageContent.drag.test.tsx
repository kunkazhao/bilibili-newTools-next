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

describe("ArchivePageContent drag reorder", () => {
  it("reorders visible items immediately after drag when switching from price sort", async () => {
    mockFetchCategories.mockResolvedValueOnce({
      categories: [
        { id: "cat-1", name: "分类1", sort_order: 0, spec_fields: [] },
      ],
    })
    mockFetchCategoryCounts.mockResolvedValueOnce({ counts: {} })
    mockFetchItems.mockResolvedValue({
      items: [
        {
          id: "item-1",
          category_id: "cat-1",
          title: "商品1",
          price: 10,
          commission: 1,
          commission_rate: 0.1,
          spec: {},
        },
        {
          id: "item-2",
          category_id: "cat-1",
          title: "商品2",
          price: 20,
          commission: 2,
          commission_rate: 0.2,
          spec: {},
        },
      ],
      has_more: false,
      next_offset: 0,
    })

    render(<ArchivePageContent />)

    await waitFor(() => expect(lastViewProps?.items?.length).toBe(2))

    lastViewProps.onSortChange("price")
    await waitFor(() => expect(lastViewProps.sortValue).toBe("price"))

    lastViewProps.onDragStart("item-1")
    lastViewProps.onDrop("item-2")

    await waitFor(() => expect(lastViewProps.items[0].id).toBe("item-2"))
  })
})

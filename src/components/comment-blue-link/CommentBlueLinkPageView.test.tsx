// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import CommentBlueLinkPageView from "./CommentBlueLinkPageView"
import type { CommentAccount, CommentCategory, CommentCombo } from "./types"

const baseProps = {
  loading: false,
  listLoading: false,
  accounts: [{ id: "a1", name: "账号" }] as CommentAccount[],
  currentAccountId: "a1",
  currentCategoryId: "__all__",
  allCategoryId: "__all__",
  accountCategories: [] as CommentCategory[],
  filteredCombos: [] as CommentCombo[],
  visibleCombos: [] as CommentCombo[],
  combosCountByAccount: new Map<string, number>(),
  onAccountChange: vi.fn(),
  onCategoryChange: vi.fn(),
  onCopyCombo: vi.fn(),
  onOpenCreate: vi.fn(),
  onOpenEdit: vi.fn(),
  onDelete: vi.fn(),
}

describe("CommentBlueLinkPageView", () => {
  it("renders preview text when collapsed", () => {
    const longText = "A".repeat(500)
    const combo = {
      id: "c1",
      name: "组合",
      account_id: "a1",
      category_id: "",
      content: longText,
      remark: "",
    } as CommentCombo

    render(
      <CommentBlueLinkPageView
        {...baseProps}
        filteredCombos={[combo]}
        visibleCombos={[combo]}
      />
    )

    expect(screen.queryByText(longText)).toBeNull()
    expect(screen.getByText(/A{100,}/)).not.toBeNull()
  })
})

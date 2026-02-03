// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import CommentBlueLinkPageView from "./CommentBlueLinkPageView"
import type { CommentAccount, CommentCombo } from "./types"

const baseProps = {
  loading: false,
  listLoading: false,
  accounts: [{ id: "a1", name: "账号" }] as CommentAccount[],
  currentAccountId: "a1",
  filteredCombos: [] as CommentCombo[],
  visibleCombos: [] as CommentCombo[],
  combosCountByAccount: new Map<string, number>(),
  comboViewStates: {},
  onAccountChange: vi.fn(),
  onCopyCombo: vi.fn(),
  onOpenCreate: vi.fn(),
  onOpenEdit: vi.fn(),
  onDelete: vi.fn(),
  onToggleVersion: vi.fn(),
}

describe("CommentBlueLinkPageView", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders preview text when collapsed", () => {
    const longText = "A".repeat(500)
    const combo = {
      id: "c1",
      name: "组合",
      account_id: "a1",
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

  it("does not lock content height when collapsed", () => {
    const longText = "A".repeat(500)
    const combo = {
      id: "c1",
      name: "组合",
      account_id: "a1",
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

    const content = screen.getByText(/A{100,}/)
    expect(content.className).not.toContain("h-[240px]")
    expect(content.className).not.toContain("overflow-hidden")
  })

  it("renders expected Chinese labels", () => {
    render(<CommentBlueLinkPageView {...baseProps} />)

    expect(screen.getByText("评论账号")).not.toBeNull()
    expect(screen.getByText("新增组合")).not.toBeNull()
    expect(screen.queryByText("空状态")).toBeNull()
    expect(screen.getByText("暂无蓝链组合")).not.toBeNull()
    expect(screen.getByText("请先新增蓝链评论组合")).not.toBeNull()
    expect(screen.getByText("新增")).not.toBeNull()
  })

  it("hides category filters and batch copy button", () => {
    render(
      <CommentBlueLinkPageView {...baseProps} />
    )

    expect(screen.queryByText("全部")).toBeNull()
    expect(screen.queryByText("批量复制")).toBeNull()
  })

  it("renders version toggle and shows product content when mode is product", async () => {
    const user = userEvent.setup()
    const combo = {
      id: "c1",
      name: "组合",
      account_id: "a1",
      content: "完整版内容",
      remark: "",
      source_link: "https://b23.tv/abc",
    } as CommentCombo

    const onToggleVersion = vi.fn()

    render(
      <CommentBlueLinkPageView
        {...baseProps}
        filteredCombos={[combo]}
        visibleCombos={[combo]}
        comboViewStates={{
          c1: {
            mode: "product",
            content: "商品A-- https://b23.tv/abc",
            loading: false,
          },
        }}
        onToggleVersion={onToggleVersion}
      />
    )

    expect(screen.getByText("\u5546\u54c1\u7248")).not.toBeNull()
    expect(screen.getByText("商品A-- https://b23.tv/abc")).not.toBeNull()

    await user.click(screen.getByText("\u5546\u54c1\u7248"))
    expect(onToggleVersion).toHaveBeenCalledTimes(1)
  })

  it("prefers product_content when present", () => {
    const combo = {
      id: "c1",
      name: "组合",
      account_id: "a1",
      content: "完整版内容",
      remark: "",
      source_link: "https://b23.tv/abc",
      product_content: "商品版内容",
    } as CommentCombo

    render(
      <CommentBlueLinkPageView
        {...baseProps}
        filteredCombos={[combo]}
        visibleCombos={[combo]}
        comboViewStates={{
          c1: {
            mode: "product",
            content: "商品版内容",
            loading: false,
          },
        }}
        onToggleVersion={vi.fn()}
      />
    )

    expect(screen.getByText("商品版内容")).not.toBeNull()
  })
})

// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import MyAccountPageView from "./MyAccountPageView"

const baseProps = {
  loading: false,
  syncing: false,
  accounts: [{ id: "a1", name: "Test" }],
  currentAccountId: "a1",
  videos: [],
  onAccountChange: () => {},
  onOpenAccountManage: () => {},
  onSync: () => {},
  onCopyVideo: () => {},
}

describe("MyAccountPageView", () => {
  it("renders sync button", () => {
    render(<MyAccountPageView {...baseProps} />)
    expect(screen.getByRole("button", { name: "获取最新视频" })).toBeTruthy()
  })

  it("hides homepage link in account list", () => {
    render(
      <MyAccountPageView
        {...baseProps}
        accounts={[
          {
            id: "a1",
            name: "Test",
            homepage_link: "https://space.bilibili.com/123",
          },
        ]}
      />
    )
    expect(screen.queryByText("https://space.bilibili.com/123")).toBeNull()
  })

  it("renders BV and danmaku stats", () => {
    render(
      <MyAccountPageView
        {...baseProps}
        videos={[
          {
            id: "v1",
            account_id: "a1",
            bvid: "BV1gEFTzWExb",
            title: "Test",
            stats: { view: 1000, like: 200, reply: 30, danmaku: 456 },
          },
        ]}
      />
    )
    expect(screen.getByText("BV: BV1gEFTzWExb")).toBeTruthy()
    expect(screen.getByText("弹幕 456")).toBeTruthy()
  })

  it("renders favorite stats when available", () => {
    render(
      <MyAccountPageView
        {...baseProps}
        videos={[
          {
            id: "v2",
            account_id: "a1",
            bvid: "BV1TEST",
            title: "Test",
            stats: { view: 100, like: 10, reply: 2, danmaku: 3, favorite: 12 },
          },
        ]}
      />
    )
    expect(screen.getByText("收藏 12")).toBeTruthy()
  })
})

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


  it("renders duration badge on video cover", () => {
    render(
      <MyAccountPageView
        {...baseProps}
        videos={[
          {
            id: "v3",
            account_id: "a1",
            bvid: "BV1DURATION",
            title: "Video Duration",
            duration: 714,
            stats: { view: 1, like: 1, reply: 1, danmaku: 1 },
          },
        ]}
      />
    )
    expect(screen.getByText("11:54")).toBeTruthy()
  })


  it("applies hover interaction style on video card", () => {
    render(
      <MyAccountPageView
        {...baseProps}
        videos={[
          {
            id: "v-hover",
            account_id: "a1",
            bvid: "BV1HOVER",
            title: "Hover Card",
          },
        ]}
      />
    )

    const card = screen.getByText("Hover Card").closest("article")
    expect(card).not.toBeNull()
    expect(card?.className).toContain("hover:-translate-y-0.5")
    expect(card?.className).toContain("hover:shadow-md")
    expect(card?.className).toContain("cursor-pointer")
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

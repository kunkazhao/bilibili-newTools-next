// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import BenchmarkAccountPageView from "./BenchmarkAccountPageView"

const baseProps = {
  loading: false,
  syncing: false,
  accounts: [{ id: "a1", name: "account-1" }],
  currentAccountId: "a1",
  videos: [],
  onAccountChange: () => {},
  onOpenAccountManage: () => {},
  onSyncCurrent: () => {},
  onSyncAll: () => {},
  onCopyVideo: () => {},
}

describe("BenchmarkAccountPageView", () => {
  it("renders duration badge on video cover", () => {
    render(
      <BenchmarkAccountPageView
        {...baseProps}
        videos={[
          {
            id: "v1",
            account_id: "a1",
            bvid: "BV1DURATION",
            title: "Duration Video",
            duration: 714,
            stats: { view: 1, like: 1, reply: 1, danmaku: 1, favorite: 1 },
          },
        ]}
      />
    )

    expect(screen.getByText("11:54")).toBeTruthy()
  })

  it("applies hover interaction style on video card", () => {
    render(
      <BenchmarkAccountPageView
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

})

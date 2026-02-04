// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import MyAccountPageContent from "./MyAccountPageContent"
import {
  fetchMyAccountState,
  fetchMyAccountVideoCounts,
  syncMyAccountVideos,
} from "./myAccountApi"

const showToast = vi.fn()

vi.mock("@/components/Toast", () => ({
  useToast: () => ({ showToast }),
  ToastProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock("@/components/ProgressDialog", () => ({
  default: (props: { open?: boolean; title?: string }) =>
    props.open ? <div>{`progress-open:${props.title}`}</div> : null,
}))

vi.mock("./myAccountApi", () => ({
  fetchMyAccountState: vi.fn(),
  fetchMyAccountVideoCounts: vi.fn(),
  syncMyAccountVideos: vi.fn(),
  syncMyAccountVideosAll: vi.fn(),
}))

describe("MyAccountPageContent", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    showToast.mockClear()
  })

  it("loads state from my account endpoint", async () => {
    vi.mocked(fetchMyAccountState).mockResolvedValue({
      accounts: [],
      videos: [],
    })

    render(
      <MyAccountPageContent />
    )

    await waitFor(() => expect(fetchMyAccountState).toHaveBeenCalled())
  })

  it("opens progress dialog while syncing videos", async () => {
    vi.mocked(fetchMyAccountState).mockResolvedValue({
      accounts: [
        {
          id: "acc-1",
          name: "小江",
          homepage_link: "https://space.bilibili.com/123",
        },
      ],
      videos: [],
    })
    vi.mocked(fetchMyAccountVideoCounts).mockResolvedValue({
      total: 2,
      items: [{ account_id: "acc-1", name: "小江", count: 2 }],
      failures: [],
    })
    vi.mocked(syncMyAccountVideos).mockResolvedValue({
      added: 0,
      updated: 0,
      videos: [],
    })

    const user = userEvent.setup()

    render(<MyAccountPageContent />)

    await waitFor(() => expect(fetchMyAccountState).toHaveBeenCalled())

    await user.click(screen.getByRole("button", { name: "获取最新视频" }))

    await waitFor(() =>
      expect(screen.getByText("progress-open:同步视频进度")).toBeTruthy()
    )
  })
})

// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import BenchmarkAccountPageContent from "./BenchmarkAccountPageContent"
import {
  fetchBenchmarkAccountState,
  fetchBenchmarkAccountVideoCounts,
  syncBenchmarkAccountVideos,
} from "./benchmarkAccountApi"

const showToast = vi.fn()

vi.mock("@/components/Toast", () => ({
  useToast: () => ({ showToast }),
  ToastProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock("@/components/ProgressDialog", () => ({
  default: (props: { open?: boolean; title?: string }) =>
    props.open ? <div>{`progress-open:${props.title}`}</div> : null,
}))

vi.mock("./benchmarkAccountApi", () => ({
  fetchBenchmarkAccountState: vi.fn(),
  fetchBenchmarkAccountVideoCounts: vi.fn(),
  syncBenchmarkAccountVideos: vi.fn(),
  syncBenchmarkAccountVideosAll: vi.fn(),
}))

describe("BenchmarkAccountPageContent", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    showToast.mockClear()
  })

  it("loads state from benchmark account endpoint", async () => {
    vi.mocked(fetchBenchmarkAccountState).mockResolvedValue({
      accounts: [],
      videos: [],
    })

    render(<BenchmarkAccountPageContent />)

    await waitFor(() => expect(fetchBenchmarkAccountState).toHaveBeenCalled())
  })

  it("opens progress dialog while syncing all benchmark accounts", async () => {
    vi.mocked(fetchBenchmarkAccountState).mockResolvedValue({
      accounts: [
        {
          id: "acc-1",
          name: "account-1",
          homepage_link: "https://space.bilibili.com/123",
        },
      ],
      videos: [],
    })
    vi.mocked(fetchBenchmarkAccountVideoCounts).mockResolvedValue({
      total: 2,
      items: [{ account_id: "acc-1", name: "account-1", count: 2 }],
      failures: [],
    })
    vi.mocked(syncBenchmarkAccountVideos).mockResolvedValue({
      added: 0,
      updated: 0,
      videos: [],
    })

    const user = userEvent.setup()

    render(<BenchmarkAccountPageContent />)

    await waitFor(() => expect(fetchBenchmarkAccountState).toHaveBeenCalled())

    await user.click(
      screen.getByRole("button", {
        name: "\u83b7\u53d6\u5168\u90e8\u8d26\u53f7\u89c6\u9891",
      })
    )

    await waitFor(() =>
      expect(
        screen.getByText(
          "progress-open:\u540c\u6b65\u5bf9\u6807\u8d26\u53f7\u89c6\u9891\u8fdb\u5ea6"
        )
      ).toBeTruthy()
    )
  })

  it("syncs current selected account only", async () => {
    vi.mocked(fetchBenchmarkAccountState).mockResolvedValue({
      accounts: [
        {
          id: "acc-1",
          name: "account-1",
          homepage_link: "https://space.bilibili.com/123",
        },
      ],
      videos: [],
    })
    vi.mocked(syncBenchmarkAccountVideos).mockResolvedValue({
      added: 1,
      updated: 1,
      videos: [],
    })

    const user = userEvent.setup()

    render(<BenchmarkAccountPageContent />)

    await waitFor(() => expect(fetchBenchmarkAccountState).toHaveBeenCalled())

    await user.click(
      screen.getByRole("button", {
        name: "\u66f4\u65b0\u5f53\u524d\u8d26\u53f7\u89c6\u9891",
      })
    )

    await waitFor(() =>
      expect(syncBenchmarkAccountVideos).toHaveBeenCalledWith("acc-1")
    )
  })
})

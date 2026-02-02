// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import SchemeDetailPageContent from "./SchemeDetailPageContent"
import { fetchBlueLinkMapState } from "@/components/blue-link-map/blueLinkMapApi"

const schemeDetailViewCapture = vi.hoisted(() => ({
  props: null as null | {
    productList: { totalCount: number }
    sidebar: { image: { activeTemplateId: string; onGenerate: () => Promise<void> | void } }
  },
}))

const showToast = vi.fn()

vi.mock("@/components/schemes/SchemeDetailDialogs", () => ({
  default: () => null,
}))

vi.mock("@/components/ProgressDialog", () => ({
  default: (props: { open?: boolean; title?: string }) =>
    props.open ? <div>{`progress-open:${props.title}`}</div> : null,
}))

vi.mock("@/components/schemes/SchemeDetailPageView", () => ({
  default: (props: typeof schemeDetailViewCapture.props) => {
    schemeDetailViewCapture.props = props
    return null
  },
}))

vi.mock("html2canvas", () => ({
  default: vi.fn(async () => ({
    toBlob: (cb: (blob: Blob | null) => void) => cb(new Blob(["png"], { type: "image/png" })),
  })),
}))

vi.mock("jszip", () => ({
  default: vi.fn().mockImplementation(() => ({
    file: vi.fn(),
    generateAsync: vi.fn().mockResolvedValue(new Blob(["zip"], { type: "application/zip" })),
  })),
}))

vi.mock("@/components/blue-link-map/blueLinkMapApi", () => ({
  fetchBlueLinkMapState: vi.fn(),
}))

vi.mock("@/components/Toast", () => ({
  useToast: () => ({ showToast }),
  ToastProvider: ({ children }: { children: ReactNode }) => children,
}))

vi.mock("@/lib/api", () => ({
  apiRequest: vi.fn((path: string) => {
    if (path.startsWith("/api/schemes/")) {
      return Promise.resolve({
        scheme: {
          id: "s1",
          name: "方案名",
          category_id: "cat-1",
          category_name: "品类",
          items: [{ id: "item-1", source_id: "p1", title: "商品A" }],
        },
      })
    }
    if (path.startsWith("/api/prompts")) {
      return Promise.resolve({ templates: {} })
    }
    if (path.startsWith("/api/sourcing/categories")) {
      return Promise.resolve({ categories: [] })
    }
    if (path.startsWith("/api/sourcing/items")) {
      return Promise.resolve({ items: [] })
    }
    if (path.startsWith("/api/image/templates")) {
      return Promise.resolve({
        templates: [
          {
            id: "tpl-1",
            name: "默认模板",
            category: "默认模板",
            html: "<div class='tpl-title'></div>",
          },
        ],
      })
    }
    return Promise.resolve({})
  }),
}))

describe("SchemeDetailPageContent", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    schemeDetailViewCapture.props = null
    localStorage.clear()
  })

  it("loads blue link state via v2 helper", async () => {
    vi.mocked(fetchBlueLinkMapState).mockResolvedValue({
      accounts: [],
      categories: [],
      entries: [],
    })

    render(<SchemeDetailPageContent schemeId="s1" onBack={() => {}} />)

    await waitFor(() =>
      expect(fetchBlueLinkMapState).toHaveBeenCalledWith(["p1"])
    )
  })

  it("downloads image zip named with scheme and category", async () => {
    const originalCreateElement = document.createElement.bind(document)
    let lastAnchor: HTMLAnchorElement | null = null

    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName)
      if (tagName.toLowerCase() === "a") {
        lastAnchor = el as HTMLAnchorElement
        lastAnchor.click = vi.fn()
      }
      return el
    })

    const boundingSpy = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockReturnValue({
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        right: 100,
        bottom: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      } as DOMRect)

    if (!("createObjectURL" in URL)) {
      Object.defineProperty(URL, "createObjectURL", { value: () => "blob:mock", writable: true })
    }
    if (!("revokeObjectURL" in URL)) {
      Object.defineProperty(URL, "revokeObjectURL", { value: () => {}, writable: true })
    }

    const createUrlSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock")
    const revokeUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

    render(<SchemeDetailPageContent schemeId="s1" onBack={() => {}} />)

    await waitFor(() => {
      expect(schemeDetailViewCapture.props?.productList.totalCount).toBe(1)
      expect(schemeDetailViewCapture.props?.sidebar.image.activeTemplateId).toBe("tpl-1")
    })

    await schemeDetailViewCapture.props?.sidebar.image.onGenerate()

    expect(lastAnchor).not.toBeNull()
    expect(lastAnchor?.download).toBe("方案名-品类.zip")

    revokeUrlSpy.mockRestore()
    createUrlSpy.mockRestore()
    boundingSpy.mockRestore()
    createElementSpy.mockRestore()
  })

  it("opens progress dialog when generating images", async () => {
    render(<SchemeDetailPageContent schemeId="s1" onBack={() => {}} />)

    await waitFor(() => {
      expect(schemeDetailViewCapture.props?.sidebar.image.activeTemplateId).toBe("tpl-1")
    })

    await schemeDetailViewCapture.props?.sidebar.image.onGenerate()

    await waitFor(() => {
      expect(screen.getByText("progress-open:生成图片进度")).not.toBeNull()
    })
  })
})

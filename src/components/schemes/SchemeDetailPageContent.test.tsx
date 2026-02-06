// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import html2canvas from "html2canvas"
import SchemeDetailPageContent, { mergeSchemeItemWithSource } from "./SchemeDetailPageContent"
import { fetchBlueLinkMapState } from "@/components/blue-link-map/blueLinkMapApi"
import { apiRequest } from "@/lib/api"

const schemeDetailViewCapture = vi.hoisted(() => ({
  props: null as null | {
    header: { onExportJson: () => void; onExportExcel: () => void; onOpenFeishu: () => void }
    productList: { totalCount: number; onGenerateImage: (id: string) => void }
    sidebar: {
      image: { activeTemplateId: string; onGenerate: () => Promise<void> | void }
      productLinks: {
        output: string
        onGenerate: () => void
        canToggleMode: boolean
        toggleModeLabel: string
        onToggleMode: () => void
      }
      blueLink: { onGenerate: () => void }
    }
  },
}))

const showToast = vi.fn()
const zipFileCalls: string[] = []

vi.mock("@/components/schemes/SchemeDetailDialogs", () => ({
  default: () => null,
}))

vi.mock("@/components/ProgressDialog", () => ({
  default: (props: { open?: boolean; title?: string }) =>
    props.open ? <div>{`progress-open:${props.title}`}</div> : null,
}))

vi.mock("@/components/LoadingDialog", () => ({
  default: (props: { open?: boolean; title?: string; message?: string }) =>
    props.open ? <div>{`loading-open:${props.title}:${props.message}`}</div> : null,
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
    file: vi.fn((name: string) => {
      zipFileCalls.push(name)
    }),
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
  it("prefers source item fields when merging", () => {
    const merged = mergeSchemeItemWithSource(
      { id: "item-1", title: "old", price: 1 },
      { id: "item-1", title: "new", price: 2 }
    )
    expect(merged.title).toBe("new")
    expect(merged.price).toBe(2)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    schemeDetailViewCapture.props = null
    localStorage.clear()
    zipFileCalls.length = 0
  })

  it("loads blue link state on demand", async () => {
    vi.mocked(fetchBlueLinkMapState).mockResolvedValue({
      accounts: [],
      categories: [],
      entries: [],
    })

    render(<SchemeDetailPageContent schemeId="s1" onBack={() => {}} />)

    await waitFor(() => {
      expect(schemeDetailViewCapture.props?.productList.totalCount).toBe(1)
    })
    expect(fetchBlueLinkMapState).not.toHaveBeenCalled()

    schemeDetailViewCapture.props?.sidebar.blueLink.onGenerate()

    await waitFor(() => {
      expect(fetchBlueLinkMapState).toHaveBeenCalledWith(["p1"])
    })
  })

  it("downloads image zip named with scheme, template, and timestamp", async () => {
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

    const schemeResponse = await apiRequest<{ scheme?: { name?: string } }>("/api/schemes/s1")
    const templateResponse = await apiRequest<{ templates?: Array<{ name?: string }> }>("/api/image/templates")
    const schemeName = String(schemeResponse?.scheme?.name || "")
    const templateName = String(templateResponse?.templates?.[0]?.name || "")
    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    const expectedPattern = new RegExp(
      `^${escapeRegExp(schemeName)}-${escapeRegExp(templateName)}-\\d{8}_\\d{6}\\.zip$`
    )

    expect(lastAnchor).not.toBeNull()
    expect(lastAnchor?.download).toMatch(expectedPattern)

    revokeUrlSpy.mockRestore()
    createUrlSpy.mockRestore()
    boundingSpy.mockRestore()
    createElementSpy.mockRestore()
  })

  it("prefixes image filenames with index when generating zip", async () => {
    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName)
      if (tagName.toLowerCase() === "a") {
        ;(el as HTMLAnchorElement).click = vi.fn()
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

    expect(zipFileCalls).toEqual(["1-商品A.png"])

    revokeUrlSpy.mockRestore()
    createUrlSpy.mockRestore()
    boundingSpy.mockRestore()
    createElementSpy.mockRestore()
  })

  it("exports json using source link only", async () => {
    const apiMock = vi.mocked(apiRequest)
    const baseImpl = apiMock.getMockImplementation()
    apiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (path.startsWith("/api/schemes/")) {
        return Promise.resolve({
          scheme: {
            id: "s1",
            name: "Scheme",
            category_id: "cat-1",
            category_name: "Category",
            items: [
              {
                id: "item-1",
                source_id: "p1",
                title: "Product A",
                link: "https://union-click.jd.com/jdc?e=promo",
                spec: {
                  _source_link: "https://item.jd.com/123.html",
                  _promo_link: "https://union-click.jd.com/jdc?e=promo",
                },
              },
            ],
          },
        })
      }
      return baseImpl ? baseImpl(path, options) : Promise.resolve({})
    })

    const originalCreateElement = document.createElement.bind(document)
    const createElementSpy = vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName)
      if (tagName.toLowerCase() === "a") {
        ;(el as HTMLAnchorElement).click = vi.fn()
      }
      return el
    })

    if (!("createObjectURL" in URL)) {
      Object.defineProperty(URL, "createObjectURL", { value: () => "blob:mock", writable: true })
    }
    if (!("revokeObjectURL" in URL)) {
      Object.defineProperty(URL, "revokeObjectURL", { value: () => {}, writable: true })
    }

    let capturedBlob: Blob | null = null
    const createUrlSpy = vi.spyOn(URL, "createObjectURL").mockImplementation((blob: Blob) => {
      capturedBlob = blob
      return "blob:mock"
    })
    const revokeUrlSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})

    render(<SchemeDetailPageContent schemeId="s1" onBack={() => {}} />)

    await waitFor(() => {
      expect(schemeDetailViewCapture.props?.productList.totalCount).toBe(1)
      expect(schemeDetailViewCapture.props?.header.onExportJson).toBeDefined()
    })

    schemeDetailViewCapture.props?.header.onExportJson()

    await waitFor(() => {
      expect(capturedBlob).not.toBeNull()
    })

    const text = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result ?? ""))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(capturedBlob as Blob)
    })
    const payload = JSON.parse(text) as Array<Record<string, string>>
    const jdLinkKey = "\u4eac\u4e1c\u94fe\u63a5"
    expect(payload[0][jdLinkKey]).toBe("https://item.jd.com/123.html")

    revokeUrlSpy.mockRestore()
    createUrlSpy.mockRestore()
    createElementSpy.mockRestore()
    apiMock.mockImplementation(baseImpl ?? (() => Promise.resolve({})))
  })

  it("truncates jd and tmall links in generated product links", async () => {
    const apiMock = vi.mocked(apiRequest)
    const baseImpl = apiMock.getMockImplementation()
    apiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (path.startsWith("/api/schemes/")) {
        return Promise.resolve({
          scheme: {
            id: "s1",
            name: "Scheme",
            category_id: "cat-1",
            category_name: "Category",
            items: [
              {
                id: "item-1",
                source_id: "p1",
                title: "Product A",
                price: 99,
                link: "https://item.jd.com/100148265520.html?unionMediaTag=2_0_1&uabt=872_12138_1_0&cu=true",
                taobao_link:
                  "https://detail.tmall.com/item.htm?abbucket=10&id=881167534932&pisk=fGesM0xxPFY_WPl9aoIePa75P3MjCP6z",
                spec: {},
              },
            ],
          },
        })
      }
      return baseImpl ? baseImpl(path, options) : Promise.resolve({})
    })

    render(<SchemeDetailPageContent schemeId="s1-truncate" onBack={() => {}} />)

    await waitFor(() => {
      expect(schemeDetailViewCapture.props?.productList.totalCount).toBe(1)
    })

    schemeDetailViewCapture.props?.sidebar.productLinks.onGenerate()

    await waitFor(() => {
      const output = schemeDetailViewCapture.props?.sidebar.productLinks.output || ""
      expect(output).toContain("https://item.jd.com/100148265520.html")
      expect(output).toContain("https://detail.tmall.com/item.htm?abbucket=10&id=881167534932")
      expect(output).not.toContain("unionMediaTag=")
      expect(output).not.toContain("&pisk=")
    })

    apiMock.mockImplementation(baseImpl ?? (() => Promise.resolve({})))
  })

  it("toggles product links output between normal and reverse mode", async () => {
    const apiMock = vi.mocked(apiRequest)
    const baseImpl = apiMock.getMockImplementation()
    apiMock.mockImplementation((path: string, options?: RequestInit) => {
      if (path.startsWith("/api/schemes/")) {
        return Promise.resolve({
          scheme: {
            id: "s1",
            name: "Scheme",
            category_id: "cat-1",
            category_name: "Category",
            items: [
              {
                id: "item-1",
                source_id: "p1",
                title: "Product A",
                price: 99,
                link: "https://item.jd.com/111.html?utm_source=test",
                taobao_link: "https://detail.tmall.com/item.htm?abbucket=1&id=222&spm=test",
                spec: {},
              },
              {
                id: "item-2",
                source_id: "p2",
                title: "Product B",
                price: 199,
                link: "https://item.jd.com/333.html?utm_source=test",
                taobao_link: "https://detail.tmall.com/item.htm?abbucket=2&id=444&spm=test",
                spec: {},
              },
            ],
          },
        })
      }
      return baseImpl ? baseImpl(path, options) : Promise.resolve({})
    })

    render(<SchemeDetailPageContent schemeId="s1" onBack={() => {}} />)

    await waitFor(() => {
      expect(schemeDetailViewCapture.props?.productList.totalCount).toBe(2)
      expect(schemeDetailViewCapture.props?.sidebar.productLinks.canToggleMode).toBe(false)
    })

    schemeDetailViewCapture.props?.sidebar.productLinks.onGenerate()

    await waitFor(() => {
      const links = schemeDetailViewCapture.props?.sidebar.productLinks
      expect(links?.canToggleMode).toBe(true)
      expect(links?.toggleModeLabel).toBe("\u5012\u5e8f\u6392\u5217")
      expect(links?.output).toContain("Product A,99\u5143")
      expect(links?.output).toContain("Product B,199\u5143")
    })

    schemeDetailViewCapture.props?.sidebar.productLinks.onToggleMode()

    await waitFor(() => {
      const links = schemeDetailViewCapture.props?.sidebar.productLinks
      const lines = String(links?.output || "")
        .split("\n")
        .filter(Boolean)
      expect(links?.toggleModeLabel).toBe("\u6b63\u5e8f\u6392\u5217")
      expect(lines).toEqual([
        "https://detail.tmall.com/item.htm?abbucket=2&id=444",
        "https://item.jd.com/333.html",
        "https://detail.tmall.com/item.htm?abbucket=1&id=222",
        "https://item.jd.com/111.html",
      ])
      expect(links?.output).not.toContain("Product A,99\u5143")
      expect(links?.output).not.toContain("Product B,199\u5143")
    })

    schemeDetailViewCapture.props?.sidebar.productLinks.onToggleMode()

    await waitFor(() => {
      const links = schemeDetailViewCapture.props?.sidebar.productLinks
      expect(links?.toggleModeLabel).toBe("\u5012\u5e8f\u6392\u5217")
      expect(links?.output).toContain("Product A,99\u5143")
      expect(links?.output).toContain("Product B,199\u5143")
    })

    apiMock.mockImplementation(baseImpl ?? (() => Promise.resolve({})))
  })

  it("uses reduced scale when generating images", async () => {
    const html2canvasMock = vi.mocked(html2canvas)
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
    render(<SchemeDetailPageContent schemeId="s1" onBack={() => {}} />)

    await waitFor(() => {
      expect(schemeDetailViewCapture.props?.sidebar.image.activeTemplateId).toBe("tpl-1")
      expect(schemeDetailViewCapture.props?.productList.totalCount).toBe(1)
    })

    await schemeDetailViewCapture.props?.sidebar.image.onGenerate()

    expect(html2canvasMock).toHaveBeenCalled()
    const options = html2canvasMock.mock.calls[0]?.[1] as { scale?: number } | undefined
    expect(options?.scale).toBe(1.5)

    boundingSpy.mockRestore()
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




  it("opens loading dialog when generating a single image", async () => {
    const html2canvasMock = vi.mocked(html2canvas)
    let resolveCanvas: ((value: { toBlob: (cb: (blob: Blob | null) => void) => void }) => void) | null = null
    const canvasPromise = new Promise<{ toBlob: (cb: (blob: Blob | null) => void) => void }>((resolve) => {
      resolveCanvas = resolve
    })
    html2canvasMock.mockImplementationOnce(async () => canvasPromise)

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

    render(<SchemeDetailPageContent schemeId="s1" onBack={() => {}} />)

    await waitFor(() => {
      expect(schemeDetailViewCapture.props?.sidebar.image.activeTemplateId).toBe("tpl-1")
    })

    schemeDetailViewCapture.props?.productList.onGenerateImage("item-1")

    await waitFor(() => {
      expect(screen.getByText(/loading-open:/)).not.toBeNull()
    })

    resolveCanvas?.({
      toBlob: (cb: (blob: Blob | null) => void) => cb(new Blob(["png"], { type: "image/png" })),
    })

    await waitFor(() => {
      expect(html2canvasMock).toHaveBeenCalled()
    })
    const options = html2canvasMock.mock.calls[0]?.[1] as { scale?: number } | undefined
    expect(options?.scale).toBe(1.5)

    boundingSpy.mockRestore()
  })

  it("uses timeout when document is hidden to avoid raf stall", async () => {
    const rafSpy = vi.fn((cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })
    vi.stubGlobal("requestAnimationFrame", rafSpy)

    const originalVisibility = Object.getOwnPropertyDescriptor(document, "visibilityState")
    Object.defineProperty(document, "visibilityState", {
      value: "hidden",
      configurable: true,
    })

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout")

    render(<SchemeDetailPageContent schemeId="s1" onBack={() => {}} />)

    await waitFor(() => {
      expect(schemeDetailViewCapture.props?.sidebar.image.activeTemplateId).toBe("tpl-1")
    })

    await schemeDetailViewCapture.props?.sidebar.image.onGenerate()

    expect(setTimeoutSpy).toHaveBeenCalled()
    expect(rafSpy).not.toHaveBeenCalled()

    setTimeoutSpy.mockRestore()
    if (originalVisibility) {
      Object.defineProperty(document, "visibilityState", originalVisibility)
    } else {
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        configurable: true,
      })
    }
    vi.unstubAllGlobals()
  })
  it("yields before rendering images so progress can paint", async () => {
    const rafSpy = vi.fn((cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })
    vi.stubGlobal("requestAnimationFrame", rafSpy)

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

    render(<SchemeDetailPageContent schemeId="s1" onBack={() => {}} />)

    await waitFor(() => {
      expect(schemeDetailViewCapture.props?.sidebar.image.activeTemplateId).toBe("tpl-1")
    })

    await schemeDetailViewCapture.props?.sidebar.image.onGenerate()

    const html2canvasMock = vi.mocked(html2canvas)
    expect(rafSpy).toHaveBeenCalled()
    expect(rafSpy.mock.invocationCallOrder[0]).toBeLessThan(
      html2canvasMock.mock.invocationCallOrder[0]
    )

    boundingSpy.mockRestore()
    vi.unstubAllGlobals()
  })
})

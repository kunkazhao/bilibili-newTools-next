import { describe, expect, it } from "vitest"
import { getArchiveSourceDisplay } from "./archiveSource"

describe("getArchiveSourceDisplay", () => {
  it("uses author name for video-sourced items", () => {
    const result = getArchiveSourceDisplay({
      sourceType: "video",
      sourceRef: "https://www.bilibili.com/video/BV1abc",
      spec: { _source_author: "作者A" },
    })
    expect(result).toBe("作者A")
  })

  it("falls back to unknown author when video source has no name", () => {
    const result = getArchiveSourceDisplay({
      sourceType: "video",
      sourceRef: "https://detail.tmall.com/item.htm?id=123",
      spec: {},
    })
    expect(result).toBe("未知作者")
  })

  it("shows manual label when no source ref is provided", () => {
    const result = getArchiveSourceDisplay({
      sourceType: "manual",
      sourceRef: "",
      spec: {},
    })
    expect(result).toBe("手动添加")
  })

  it("uses source ref for archived items", () => {
    const result = getArchiveSourceDisplay({
      sourceType: "archive",
      sourceRef: "来自归档页面",
      spec: {},
    })
    expect(result).toBe("来自归档页面")
  })
})

import { describe, expect, it } from "vitest"
import { ApiError } from "@/lib/api"
import { getUserErrorMessage } from "@/lib/errorMessages"

describe("getUserErrorMessage", () => {
  it("returns mapped message for known error code", () => {
    const error = new ApiError("请求超时（30000ms）", {
      code: "REQUEST_TIMEOUT",
      status: 408,
    })

    expect(getUserErrorMessage(error, "加载失败")).toBe("请求超时，请稍后重试")
  })

  it("maps known english backend message", () => {
    const error = new ApiError("Question not found", {
      code: "HTTP_404",
      status: 404,
    })

    expect(getUserErrorMessage(error, "加载失败")).toBe("问题不存在或已删除")
  })

  it("uses status fallback when message looks technical", () => {
    const error = new ApiError("Traceback: internal stack trace", {
      code: "HTTP_500",
      status: 500,
    })

    expect(getUserErrorMessage(error, "保存失败，请稍后重试")).toBe(
      "服务暂时不可用，请稍后重试"
    )
  })

  it("keeps concise chinese message from backend", () => {
    const error = new ApiError("分类名称不能为空", {
      code: "HTTP_400",
      status: 400,
    })

    expect(getUserErrorMessage(error, "保存失败")).toBe("分类名称不能为空")
  })

  it("falls back for plain english runtime errors", () => {
    const error = new Error("network error")
    expect(getUserErrorMessage(error, "加载失败，请稍后重试")).toBe(
      "加载失败，请稍后重试"
    )
  })
})

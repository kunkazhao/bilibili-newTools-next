// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import ReplaceCoverDialog from "./ReplaceCoverDialog"

describe("ReplaceCoverDialog", () => {
  it("submits selected files", () => {
    const onSubmit = vi.fn()
    const file = new File(["a"], "SB001-test.jpg", { type: "image/jpeg" })

    render(
      <ReplaceCoverDialog
        open
        onOpenChange={() => {}}
        onSubmit={onSubmit}
      />
    )

    const input = screen.getByLabelText("选择图片")
    fireEvent.change(input, { target: { files: [file] } })
    fireEvent.click(screen.getByText("开始替换"))

    expect(onSubmit).toHaveBeenCalledWith([file])
  })
})

// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import ModalForm from "@/components/ModalForm"

describe("ModalForm", () => {
  it("applies lg size when requested", () => {
    render(
      <ModalForm
        isOpen
        title="测试"
        onSubmit={() => {}}
        onOpenChange={() => {}}
        confirmLabel="保存"
        size="lg"
      >
        <div>内容</div>
      </ModalForm>
    )

    const content = document.querySelector(".dialog-content")
    expect(content?.className).toContain("sm:max-w-[720px]")
  })
})
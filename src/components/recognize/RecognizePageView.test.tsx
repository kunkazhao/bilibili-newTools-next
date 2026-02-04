// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"

import { cleanup, render, screen } from "@testing-library/react"

import type { RefObject } from "react"

import RecognizePageView from "./RecognizePageView"

const inputRef = {
  current: document.createElement("input"),
} as RefObject<HTMLInputElement>

const baseProps = {
  entries: [],
  columns: ["扳机", "摇杆", "肩键"],
  isProcessing: false,
  isDragging: false,
  isColumnLocked: false,
  draggingColumn: null,
  dragOverColumn: null,
  inputRef,
  onOpenFilePicker: vi.fn(),
  onInputChange: vi.fn(),
  onDrop: vi.fn(),
  onDragOver: vi.fn(),
  onDragEnter: vi.fn(),
  onDragLeave: vi.fn(),
  onStartDragColumn: vi.fn(),
  onEndDragColumn: vi.fn(),
  onDragOverColumn: vi.fn(),
  onDropColumn: vi.fn(),
  onEditColumn: vi.fn(),
  onDeleteColumn: vi.fn(),
  onPreviewImage: vi.fn(),
  onDeleteEntry: vi.fn(),
  onAddColumn: vi.fn(),
  onExport: vi.fn(),
  onClear: vi.fn(),
  onLockChange: vi.fn(),
}

describe("RecognizePageView", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("removes the drag upload zone", () => {
    render(<RecognizePageView {...baseProps} />)

    expect(screen.queryByText("将图片拖动到此处，或点击上传")).toBeNull()
    expect(screen.queryByText("支持多张图片批量识别")).toBeNull()
  })

  it("hides empty-state title but keeps description", () => {
    render(<RecognizePageView {...baseProps} />)

    expect(screen.queryByText("暂无识别结果")).toBeNull()
    expect(
      screen.getByText("还没有添加图片，点击“新增商品”上传后即可在此查看。")
    ).not.toBeNull()
  })

  it("uses a switch control for column lock", () => {
    render(<RecognizePageView {...baseProps} />)

    expect(screen.getByRole("switch", { name: "固定列" })).not.toBeNull()
  })

  it("uses icon-only delete buttons for columns", () => {
    render(
      <RecognizePageView
        {...baseProps}
        entries={[
          {
            id: "entry-1",
            name: "Sample",
            price: "12",
            image: "",
            params: {},
          },
        ]}
      />
    )

    expect(screen.getAllByLabelText("删除列")).toHaveLength(3)
  })
})

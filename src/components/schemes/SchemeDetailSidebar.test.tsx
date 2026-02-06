// @vitest-environment jsdom
import React from "react"
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import SchemeDetailSidebar from "./SchemeDetailSidebar"

const deleteLabel = "\u5220\u9664"
const copyLabel = "\u590d\u5236"

const baseProps = {
  copywriting: {
    title: "",
    vote: "",
    onTitleChange: () => {},
    onVoteChange: () => {},
    onOpenPrompt: () => {},
    onCopy: () => {},
    onGenerate: () => {},
  },
  productLinks: {
    output: "",
    onOutputChange: () => {},
    onCopy: () => {},
    onGenerate: () => {},
    canToggleMode: false,
    toggleModeLabel: "\u5012\u5e8f\u6392\u5217",
    onToggleMode: () => {},
  },
  commentReply: {
    count: 1,
    prompt: "",
    output: "",
    onCountChange: () => {},
    onPromptChange: () => {},
    onOutputChange: () => {},
    onOpenPrompt: () => {},
    onCopy: () => {},
    onGenerate: () => {},
  },
  blueLink: {
    accounts: [
      { id: "acc-1", name: "Account A" },
      { id: "acc-2", name: "Account B" },
    ],
    selectedAccountId: "acc-1",
    ranges: [{ min: 0, max: 100 }],
    groups: [],
    missingMessage: "",
    onAccountChange: () => {},
    onRangeChange: () => {},
    onAddRange: () => {},
    onRemoveRange: () => {},
    onCopyAll: () => {},
    onCopyGroup: () => {},
    onGenerate: () => {},
  },
  image: {
    categories: [],
    templates: [],
    activeCategory: "",
    activeTemplateId: "",
    emptyValue: "__empty__",
    status: null,
    onCategoryChange: () => {},
    onTemplateChange: () => {},
    onGenerate: () => {},
  },
}

describe("SchemeDetailSidebar", () => {
  it("renders a single-select account dropdown", () => {
    render(<SchemeDetailSidebar {...baseProps} />)
    expect(screen.getByRole("combobox", { name: "Blue link account" })).not.toBeNull()
  })

  it("uses icon delete for price ranges", () => {
    render(<SchemeDetailSidebar {...baseProps} />)
    expect(screen.getAllByLabelText(deleteLabel).length).toBeGreaterThan(0)
  })

  it("shows three blue link actions and copy icon", () => {
    render(<SchemeDetailSidebar {...baseProps} />)
    expect(screen.getAllByLabelText(copyLabel).length).toBeGreaterThan(1)
  })

  it("replaces intro card with product links card", () => {
    render(<SchemeDetailSidebar {...baseProps} />)
    expect(screen.queryByText("\u751f\u6210\u7b80\u4ecb")).toBeNull()
    expect(screen.getAllByText("\u751f\u6210\u5546\u54c1\u94fe\u63a5").length).toBeGreaterThan(0)
  })

  it("hides toggle button before product links are generated", () => {
    render(<SchemeDetailSidebar {...baseProps} />)
    expect(screen.queryByRole("button", { name: "\u5012\u5e8f\u6392\u5217" })).toBeNull()
  })

  it("shows toggle button after product links are generated", () => {
    render(
      <SchemeDetailSidebar
        {...baseProps}
        productLinks={{
          ...baseProps.productLinks,
          canToggleMode: true,
          toggleModeLabel: "\u6b63\u5e8f\u6392\u5217",
        }}
      />
    )
    expect(screen.getByRole("button", { name: "\u6b63\u5e8f\u6392\u5217" })).not.toBeNull()
  })

})

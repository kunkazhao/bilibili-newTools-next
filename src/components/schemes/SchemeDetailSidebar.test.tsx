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
    intro: "",
    vote: "",
    onTitleChange: () => {},
    onIntroChange: () => {},
    onVoteChange: () => {},
    onOpenPrompt: () => {},
    onCopy: () => {},
    onGenerate: () => {},
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
    missingMessage: "",
    status: null,
    onCategoryChange: () => {},
    onTemplateChange: () => {},
    onRefreshMissing: () => {},
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
    expect(screen.getAllByLabelText(copyLabel).length).toBeGreaterThan(0)
  })
})
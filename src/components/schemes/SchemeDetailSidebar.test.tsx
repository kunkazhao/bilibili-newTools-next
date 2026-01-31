// @vitest-environment jsdom
import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import SchemeDetailSidebar from "./SchemeDetailSidebar"

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
      { id: "acc-1", name: "小江1" },
      { id: "acc-2", name: "小燃" },
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

  it("uses icon delete for price ranges", async () => {
    const onRemoveRange = vi.fn()
    render(<SchemeDetailSidebar {...baseProps} blueLink={{ ...baseProps.blueLink, onRemoveRange }} />)
    const user = userEvent.setup()
    await user.click(screen.getByLabelText("删除"))
    expect(onRemoveRange).toHaveBeenCalledOnce()
  })

  it("shows three blue link actions and copy icon", async () => {
    const onCopyAll = vi.fn()
    render(<SchemeDetailSidebar {...baseProps} blueLink={{ ...baseProps.blueLink, onCopyAll }} />)
    const user = userEvent.setup()
    await user.click(screen.getByLabelText("复制"))
    expect(onCopyAll).toHaveBeenCalledOnce()
  })
})

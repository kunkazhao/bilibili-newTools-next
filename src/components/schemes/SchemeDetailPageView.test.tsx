// @vitest-environment jsdom
import React from "react"
import { describe, expect, it, vi } from "vitest"
import { render } from "@testing-library/react"
import SchemeDetailPageView from "./SchemeDetailPageView"

vi.mock("@/components/schemes/SchemeDetailHeader", () => ({
  default: () => <div data-testid="scheme-header" />,
}))

vi.mock("@/components/schemes/SchemeDetailToolbar", () => ({
  default: () => <div data-testid="scheme-toolbar" />,
}))

vi.mock("@/components/schemes/SchemeDetailProductList", () => ({
  default: () => <div data-testid="scheme-list" />,
}))

vi.mock("@/components/schemes/SchemeDetailSidebar", () => ({
  default: () => <div data-testid="scheme-sidebar" />,
}))

describe("SchemeDetailPageView", () => {
  it("uses a smaller left column and larger right column", () => {
    const { container } = render(
      <SchemeDetailPageView
        header={{
          name: "方案",
          categoryName: "分类",
          itemCount: 0,
          createdAt: "2026-01-30",
          onBack: () => {},
        }}
        toolbar={{
          priceMin: "",
          priceMax: "",
          sortValue: "manual",
          onPriceMinChange: () => {},
          onPriceMaxChange: () => {},
          onSortChange: () => {},
          onClearItems: () => {},
          onOpenPicker: () => {},
          onExport: () => {},
          onOpenFeishu: () => {},
        }}
        productList={{
          items: [],
          totalCount: 0,
          onOpenPicker: () => {},
          onGenerateImage: () => {},
          onEdit: () => {},
          onRemove: () => {},
          onDragStart: () => {},
          onDrop: () => {},
        }}
        sidebar={{
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
            accounts: [],
            selectedAccountIds: new Set(),
            ranges: [],
            groups: [],
            missingMessage: "",
            onToggleAccount: () => {},
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
            emptyValue: "",
            missingMessage: "",
            status: null,
            onCategoryChange: () => {},
            onTemplateChange: () => {},
            onRefreshMissing: () => {},
            onGenerate: () => {},
          },
        }}
      />
    )

    expect(
      container.querySelector('.lg\\:grid-cols-\\[320px_1fr\\]')
    ).not.toBeNull()
  })
})

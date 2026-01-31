# Scheme Detail Blue Link UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update the scheme detail sidebar Blue Link UI to use a single-select account dropdown, icon-only delete/copy actions, aligned buttons, and reduced card height.

**Architecture:** Keep the current data flow in `SchemeDetailPageContent` but replace multi-select account state with a single account id. Update `SchemeDetailSidebar` rendering to use Shadcn Select and icon buttons. Adjust spacing to reduce card height.

**Tech Stack:** React + TypeScript, shadcn/ui components, Tailwind CSS, Vitest + Testing Library.

---

### Task 1: Add failing tests for the Blue Link sidebar UI

**Files:**
- Create: `src/components/schemes/SchemeDetailSidebar.test.tsx`

**Step 1: Write the failing test**

```tsx
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
    render(
      <SchemeDetailSidebar
        {...baseProps}
        blueLink={{ ...baseProps.blueLink, onRemoveRange }}
      />
    )
    const user = userEvent.setup()
    await user.click(screen.getByLabelText("删除"))
    expect(onRemoveRange).toHaveBeenCalledOnce()
  })

  it("shows three blue link actions and copy icon", async () => {
    const onCopyAll = vi.fn()
    render(
      <SchemeDetailSidebar
        {...baseProps}
        blueLink={{ ...baseProps.blueLink, onCopyAll }}
      />
    )
    const user = userEvent.setup()
    await user.click(screen.getByLabelText("复制"))
    expect(onCopyAll).toHaveBeenCalledOnce()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/schemes/SchemeDetailSidebar.test.tsx`
Expected: FAIL due to missing UI and prop types.

**Step 3: Commit the failing test**

```bash
git add src/components/schemes/SchemeDetailSidebar.test.tsx
git commit -m "test: add scheme detail sidebar blue link UI expectations"
```

---

### Task 2: Update sidebar props + UI to pass tests

**Files:**
- Modify: `src/components/schemes/SchemeDetailSidebar.tsx`
- Modify: `src/components/schemes/SchemeDetailPageView.tsx`
- Modify: `src/components/schemes/SchemeDetailPageView.test.tsx`

**Step 1: Write minimal implementation**

- Replace checkbox list with Shadcn `Select` for accounts.
- Add `aria-label="Blue link account"` on the trigger.
- Replace price range delete text button with icon-only delete button (`Trash2`).
- Add copy icon button with `aria-label="复制"` in the three-button row.
- Align buttons in a single row and reduce spacing.
- Reduce card padding and `space-y` gaps.

**Step 2: Run the test**

Run: `npx vitest run src/components/schemes/SchemeDetailSidebar.test.tsx`
Expected: PASS.

**Step 3: Commit**

```bash
git add src/components/schemes/SchemeDetailSidebar.tsx src/components/schemes/SchemeDetailPageView.tsx src/components/schemes/SchemeDetailPageView.test.tsx
git commit -m "feat: update scheme detail sidebar blue link UI"
```

---

### Task 3: Update data flow for single account selection

**Files:**
- Modify: `src/components/schemes/SchemeDetailPageContent.tsx`

**Step 1: Write minimal implementation**

- Replace `selectedAccountIds` Set with `selectedAccountId` string.
- Update localStorage persistence to store a single id.
- Default selection to first available account.
- In blue link generation, use only the selected account.

**Step 2: Run the tests**

Run: `npm test`
Expected: PASS.

**Step 3: Commit**

```bash
git add src/components/schemes/SchemeDetailPageContent.tsx
git commit -m "feat: use single blue link account selection"
```

---

### Task 4: Verify UI manually (optional)

**Step 1: Run dev server**
Run: `npm run dev`

**Step 2: Open scheme detail page**
Open: `http://localhost:5173/?schemeId=<valid-id>&standalone=1`

**Step 3: Visual check**
- Account dropdown is single-select.
- Delete is icon-only.
- Three actions align in one row, copy icon third.
- Cards are shorter in height.

---

## Notes
- The usual workflow expects a dedicated worktree, but the worktree skill is disabled in this environment. Proceed in the current workspace.


# Interactive Card Hover Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce a shared InteractiveCard for clickable cards and centralize hover feedback styles so global tweaks are made in one place.

**Architecture:** Add a UI-level InteractiveCard component that injects a single `.card-interactive` class when `interactive` is true (supports `asChild`). Define hover/transition styles for `.card-interactive` in `src/index.css` using CSS variables in `:root` for centralized control. Update the four clickable card surfaces to wrap with InteractiveCard and remove per-card hover styling.

**Tech Stack:** React + TypeScript, Tailwind (via class strings), Vitest + Testing Library, Radix Slot.

> **Note:** Worktree creation is disabled in this environment; this plan assumes the current workspace.

---

### Task 1: Add `InteractiveCard` UI component

**Files:**
- Create: `src/components/ui/interactive-card.tsx`
- Create: `src/components/ui/interactive-card.test.tsx`

**Step 1: Write the failing test**

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { InteractiveCard } from "./interactive-card"

describe("InteractiveCard", () => {
  it("adds card-interactive class when interactive", () => {
    render(
      <InteractiveCard interactive data-testid="card">
        content
      </InteractiveCard>
    )
    expect(screen.getByTestId("card").className).toContain("card-interactive")
  })

  it("does not add card-interactive class when not interactive", () => {
    render(<InteractiveCard data-testid="card">content</InteractiveCard>)
    expect(screen.getByTestId("card").className).not.toContain("card-interactive")
  })

  it("supports asChild and applies class to child element", () => {
    render(
      <InteractiveCard asChild interactive>
        <article data-testid="card">content</article>
      </InteractiveCard>
    )
    expect(screen.getByTestId("card").className).toContain("card-interactive")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ui/interactive-card.test.tsx`
Expected: FAIL (module not found or class missing)

**Step 3: Write minimal implementation**

```tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface InteractiveCardProps
  extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean
  interactive?: boolean
}

const InteractiveCard = React.forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ className, asChild = false, interactive = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div"
    return (
      <Comp
        ref={ref}
        className={cn(className, interactive && "card-interactive")}
        {...props}
      />
    )
  }
)
InteractiveCard.displayName = "InteractiveCard"

export { InteractiveCard }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ui/interactive-card.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ui/interactive-card.tsx src/components/ui/interactive-card.test.tsx
git commit -m "feat: add interactive card base component"
```

---

### Task 2: Archive list card uses InteractiveCard + tests update

**Files:**
- Modify: `src/components/archive/ArchiveListCard.test.tsx`
- Modify: `src/components/archive/ArchiveListCard.tsx`

**Step 1: Write the failing test**
Update the existing test to assert the card body has `card-interactive` when clickable:

```tsx
expect(body.className).toContain("card-interactive")
```

(Keep cover pointer check as-is.)

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/archive/ArchiveListCard.test.tsx`
Expected: FAIL (missing `card-interactive`)

**Step 3: Write minimal implementation**
- Replace outer `<div>` with `<InteractiveCard>` and pass `interactive={Boolean(onCardClick)}`
- Remove `cardCursorClass` usage
- Keep cover cursor logic

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/archive/ArchiveListCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ArchiveListCard.tsx src/components/archive/ArchiveListCard.test.tsx
git commit -m "refactor: use InteractiveCard in archive list card"
```

---

### Task 3: Scheme detail product list uses InteractiveCard + tests update

**Files:**
- Modify: `src/components/schemes/SchemeDetailProductList.test.tsx`
- Modify: `src/components/schemes/SchemeDetailProductList.tsx`

**Step 1: Write the failing test**
In the existing card click test, add:

```tsx
expect(card.className).toContain("card-interactive")
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/schemes/SchemeDetailProductList.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**
- Wrap the card `div` with `<InteractiveCard asChild interactive={Boolean(onCardClick)}>`
- Remove `cardCursorClass` logic

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/schemes/SchemeDetailProductList.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/schemes/SchemeDetailProductList.tsx src/components/schemes/SchemeDetailProductList.test.tsx
git commit -m "refactor: use InteractiveCard in scheme detail cards"
```

---

### Task 4: Commission list card uses InteractiveCard + tests update

**Files:**
- Modify: `src/components/commission/CommissionListCard.test.tsx`
- Modify: `src/components/commission/CommissionListCard.tsx`

**Step 1: Write the failing test**
In the existing card click test, add:

```tsx
expect(card.className).toContain("card-interactive")
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/commission/CommissionListCard.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**
- Replace outer `div` with `<InteractiveCard interactive={Boolean(onCardClick)}>`
- Remove `cardCursorClass` logic

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/commission/CommissionListCard.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/commission/CommissionListCard.tsx src/components/commission/CommissionListCard.test.tsx
git commit -m "refactor: use InteractiveCard in commission card"
```

---

### Task 5: Schemes page cards use InteractiveCard + tests update

**Files:**
- Modify: `src/components/schemes/SchemesPageView.test.tsx`
- Modify: `src/components/schemes/SchemesPageView.tsx`

**Step 1: Write the failing test**
Add a test (or extend an existing one) to assert the scheme card includes `card-interactive`:

```tsx
const card = screen.getByText("Ö÷·½°¸").closest("article")
expect(card?.className).toContain("card-interactive")
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/schemes/SchemesPageView.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**
- Wrap the `<article>` with `<InteractiveCard asChild interactive>`
- Remove per-card hover classes (`hover:*`, `transition`, `cursor-pointer`) from the article className

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/schemes/SchemesPageView.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/schemes/SchemesPageView.tsx src/components/schemes/SchemesPageView.test.tsx
git commit -m "refactor: use InteractiveCard in schemes page"
```

---

### Task 6: Add global interactive hover styles + variables

**Files:**
- Modify: `src/index.css`

**Step 1: Write the minimal style**
Add centralized hover styling:

```css
:root {
  --card-interactive-hover-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
  --card-interactive-hover-border: #cbd5f5;
  --card-interactive-hover-translate: -1px;
  --card-interactive-transition: 180ms ease;
}

@layer components {
  .card-interactive {
    cursor: pointer;
    transition:
      box-shadow var(--card-interactive-transition),
      border-color var(--card-interactive-transition),
      transform var(--card-interactive-transition);
  }

  .card-interactive:hover {
    border-color: var(--card-interactive-hover-border);
    box-shadow: var(--card-interactive-hover-shadow);
    transform: translateY(var(--card-interactive-hover-translate));
  }
}
```

**Step 2: Quick manual check**
Hover any clickable card and confirm shadow/highlight now applies.

**Step 3: Commit**

```bash
git add src/index.css
git commit -m "style: centralize interactive card hover styles"
```

---

## Final Verification
Run targeted tests:

```bash
npm test -- src/components/ui/interactive-card.test.tsx
npm test -- src/components/archive/ArchiveListCard.test.tsx
npm test -- src/components/schemes/SchemeDetailProductList.test.tsx
npm test -- src/components/commission/CommissionListCard.test.tsx
npm test -- src/components/schemes/SchemesPageView.test.tsx
```

Expected: All PASS.

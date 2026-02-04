# Progress Dialog Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a single configurable progress dialog component and wire it into Recognize, Scheme Detail (image generation), and Archive import flows with a unified look & behavior.

**Architecture:** Create `ProgressDialog` as a shared component (Dialog-based) with configurable summary/failure list/cancel button. Replace existing progress UIs (BlueLinkMap/Import) and add new progress states for Recognize batch recognition and SchemeDetail image generation. Keep existing async logic, but surface progress data to the new dialog.

**Tech Stack:** React + TypeScript, shadcn/ui Dialog, Vitest + Testing Library, existing app state patterns.

> Note: Worktree is normally recommended by skill, but user requires no worktree. Proceed on current branch.

---

### Task 1: Add ProgressDialog component (style per reference)

**Files:**
- Create: `src/components/ProgressDialog.tsx`
- Test: `src/components/ProgressDialog.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/ProgressDialog.test.tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"
import ProgressDialog from "./ProgressDialog"

describe("ProgressDialog", () => {
  it("renders title, percent, summary and failure list", () => {
    render(
      <ProgressDialog
        open
        title="映射进度"
        status="running"
        total={10}
        processed={5}
        failures={[{ name: "未识别SKU", reason: "商品无法匹配" }]}
        showSummary
        showFailures
        allowCancel
      />
    )

    expect(screen.getByText("映射进度")).not.toBeNull()
    expect(screen.getByText("50%" গ্রহণ)).not.toBeNull()
    expect(screen.getByText("10个商品 · 1个失败")).not.toBeNull()
    expect(screen.getByText("未识别SKU")).not.toBeNull()
    expect(screen.getByText("商品无法匹配")).not.toBeNull()
    expect(screen.getByRole("button", { name: "取消" })).not.toBeNull()
  })

  it("shows close button when done", () => {
    render(
      <ProgressDialog
        open
        title="导入进度"
        status="done"
        total={3}
        processed={3}
        showSummary
      />
    )
    expect(screen.getByRole("button", { name: "关闭" })).not.toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/ProgressDialog.test.tsx`
Expected: FAIL (component not found / assertions fail)

**Step 3: Write minimal implementation**

```tsx
// src/components/ProgressDialog.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type Failure = { name: string; link?: string; reason?: string }

type ProgressDialogProps = {
  open: boolean
  title: string
  status: "running" | "done" | "cancelled" | "error"
  total: number
  processed: number
  success?: number
  failures?: Failure[]
  showSummary?: boolean
  showFailures?: boolean
  allowCancel?: boolean
  showCloseOnDone?: boolean
  onCancel?: () => void
  onOpenChange?: (open: boolean) => void
}

export default function ProgressDialog({
  open,
  title,
  status,
  total,
  processed,
  success,
  failures = [],
  showSummary = true,
  showFailures = false,
  allowCancel = false,
  showCloseOnDone = true,
  onCancel,
  onOpenChange,
}: ProgressDialogProps) {
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0
  const failureCount = failures.length
  const summaryText = `${total}个商品 · ${failureCount}个失败`
  const isRunning = status === "running"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold text-slate-900">{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="text-xs text-slate-500">{percent}%</div>
          </div>

          {showSummary ? (
            <div className="text-sm text-slate-600">{summaryText}</div>
          ) : null}

          {showFailures ? (
            <div className="space-y-2">
              {failures.length === 0 ? null : (
                failures.map((item, index) => (
                  <div key={`${item.name}-${index}`} className="rounded-lg border border-slate-200 p-3">
                    <div className="text-sm text-rose-500">{item.name}</div>
                    {item.reason ? (
                      <div className="text-xs text-slate-500">{item.reason}</div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          {isRunning && allowCancel ? (
            <Button variant="outline" onClick={onCancel}>取消</Button>
          ) : showCloseOnDone ? (
            <Button variant="outline" onClick={() => onOpenChange?.(false)}>关闭</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/ProgressDialog.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/ProgressDialog.tsx src/components/ProgressDialog.test.tsx
git commit -m "feat: add unified progress dialog"
```

---

### Task 2: Replace BlueLinkMap progress UI with ProgressDialog

**Files:**
- Modify: `src/components/blue-link-map/BlueLinkMapDialogs.tsx`
- Test: update `src/components/blue-link-map/BlueLinkMapDialogs.test.tsx` if needed

**Step 1: Write failing test**

Add an assertion that the dialog renders percent and summary line using ProgressDialog.

```tsx
// in BlueLinkMapDialogs.test.tsx
expect(screen.getByText("映射进度")).not.toBeNull()
expect(screen.getByText("50%"))).not.toBeNull()
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/blue-link-map/BlueLinkMapDialogs.test.tsx`
Expected: FAIL (not using ProgressDialog)

**Step 3: Implement**
- Import `ProgressDialog`.
- Replace the existing progress Dialog section with `<ProgressDialog ... />`.
- Map current props:
  - `title` = `${progressLabel}进度`
  - `status` = `progressRunning ? "running" : progressCancelled ? "cancelled" : "done"`
  - `total`/`processed`/`success`/`failures` from existing
  - `showSummary` true, `showFailures` true, `allowCancel` true
  - `onCancel` -> `onProgressCancel`
  - `onOpenChange` -> `onProgressOpenChange`

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/blue-link-map/BlueLinkMapDialogs.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/blue-link-map/BlueLinkMapDialogs.tsx src/components/blue-link-map/BlueLinkMapDialogs.test.tsx
git commit -m "refactor: use ProgressDialog in blue link map"
```

---

### Task 3: Replace ImportProgressModal with ProgressDialog

**Files:**
- Modify: `src/components/archive/ImportProgressModal.tsx`
- Update any callers if needed

**Step 1: Write failing test**

Add test (new or existing) for ImportProgressModal to assert summary/percent.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/archive/ImportProgressModal.test.tsx`
Expected: FAIL (if new test)

**Step 3: Implement**
- Replace `ActionModal` usage with `ProgressDialog`.
- Map state:
  - `title="导入进度"`
  - `status` from `state.status` (running/done)
  - `total`/`processed`/`success`/`failures` from state
  - `showSummary` true, `showFailures` true
  - `allowCancel` true while running

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/archive/ImportProgressModal.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/archive/ImportProgressModal.tsx src/components/archive/ImportProgressModal.test.tsx
git commit -m "refactor: use ProgressDialog for archive import"
```

---

### Task 4: Add progress dialog to Recognize batch processing

**Files:**
- Modify: `src/components/recognize/RecognizePageContent.tsx`
- Modify: `src/components/recognize/RecognizeDialogs.tsx`
- Test: `src/components/recognize/RecognizePageContent.test.tsx`

**Step 1: Write failing test**

```tsx
// add to RecognizePageContent.test.tsx
it("shows progress dialog while processing", async () => {
  // mock FileReader + fetch response
  // trigger handleFiles
  // expect ProgressDialog title to render
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/recognize/RecognizePageContent.test.tsx`
Expected: FAIL

**Step 3: Implement**
- Add progress state: `progressOpen`, `progressStatus`, `progressTotal`, `progressProcessed`, `progressSuccess`, `progressFailures`.
- Add cancel ref `cancelRef` and handler `onCancel`.
- In `handleFiles`:
  - initialize progress state and open dialog
  - increment processed after each file
  - push failure with `{ name: file.name, reason: message }`
  - if cancel flag set, break loop and set status cancelled
  - on finish, set status done
- Pass progress props into `RecognizeDialogs` and render `ProgressDialog` there.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/recognize/RecognizePageContent.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/recognize/RecognizePageContent.tsx src/components/recognize/RecognizeDialogs.tsx src/components/recognize/RecognizePageContent.test.tsx
git commit -m "feat: add progress dialog to recognize batch"
```

---

### Task 5: Add progress dialog to SchemeDetail image generation

**Files:**
- Modify: `src/components/schemes/SchemeDetailPageContent.tsx`
- Test: `src/components/schemes/SchemeDetailPageContent.test.tsx`

**Step 1: Write failing test**

```tsx
it("opens progress dialog when generating images", async () => {
  // mock html2canvas + JSZip
  // render SchemeDetailPageContent with items
  // click "生成图片"
  // expect progress dialog title
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/schemes/SchemeDetailPageContent.test.tsx`
Expected: FAIL

**Step 3: Implement**
- Add progress state and cancel ref for image generation.
- On `generateImages` start: open dialog, set total/processed/success/failures.
- Inside loop: update processed/success/failures; check cancel flag before each item.
- On cancel: stop loop, still generate zip if successCount > 0, set status `cancelled`.
- Render `ProgressDialog` in SchemeDetailPageContent.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/schemes/SchemeDetailPageContent.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/schemes/SchemeDetailPageContent.tsx src/components/schemes/SchemeDetailPageContent.test.tsx
git commit -m "feat: add progress dialog for scheme image generation"
```

---

### Task 6: Verification

**Step 1: Run focused tests**

Run: `npm test -- src/components/ProgressDialog.test.tsx src/components/blue-link-map/BlueLinkMapDialogs.test.tsx src/components/recognize/RecognizePageContent.test.tsx src/components/schemes/SchemeDetailPageContent.test.tsx`
Expected: PASS

**Step 2: Optional full test**

Run: `npm test`
Expected: PASS

---

Plan complete and saved to `docs/plans/2026-02-02-progress-dialog-implementation.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?

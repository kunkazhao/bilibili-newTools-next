# Commission Pinned Comment Concurrency Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Speed up “提取置顶评论链接” on the Commission page with bounded concurrency and light retry.

**Architecture:** Add a small async pool/queue helper in `src/lib` (with tests). Update `CommissionPageContent` to run comment fetches in a fixed-size pool and feed product-link fetches into a concurrent queue, while keeping existing summary/dedupe logic and progress UI intact. Wrap `getPinnedComments` with retry for rate-limit style errors.

**Tech Stack:** React + TypeScript + Vitest.

### Task 1: Async Pool + Queue Helpers

**Files:**
- Create: `src/lib/asyncPool.ts`
- Test: `src/lib/asyncPool.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { createAsyncQueue, runQueueWithConcurrency, runWithConcurrency } from "./asyncPool"

describe("runWithConcurrency", () => {
  it("respects concurrency limits and processes all items", async () => {
    const items = Array.from({ length: 6 }, (_, index) => index)
    let inFlight = 0
    let maxInFlight = 0
    const seen: number[] = []

    await runWithConcurrency(items, 2, async (value) => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 10))
      seen.push(value)
      inFlight -= 1
    })

    expect(maxInFlight).toBeLessThanOrEqual(2)
    expect(seen.sort()).toEqual(items)
  })
})

describe("runQueueWithConcurrency", () => {
  it("drains a queue and waits for close", async () => {
    const queue = createAsyncQueue<number>()
    const seen: number[] = []

    const runner = runQueueWithConcurrency(queue, 2, async (value) => {
      seen.push(value)
    })

    queue.push(1)
    queue.push(2)
    queue.push(3)
    queue.close()

    await runner
    expect(seen.sort()).toEqual([1, 2, 3])
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/asyncPool.test.ts`  
Expected: FAIL (module not found / exported helpers missing).

**Step 3: Write minimal implementation**

```ts
export const runWithConcurrency = async <T>(
  items: T[],
  limit: number,
  handler: (item: T, index: number) => Promise<void>
) => { /* ... */ }

export const createAsyncQueue = <T>() => { /* push/close/next */ }

export const runQueueWithConcurrency = async <T>(
  queue: AsyncQueue<T>,
  limit: number,
  handler: (item: T) => Promise<void>
) => { /* ... */ }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/asyncPool.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/asyncPool.ts src/lib/asyncPool.test.ts
git commit -m "feat: add async pool helpers"
```

### Task 2: Retry Helper for Bili Fetches

**Files:**
- Modify: `src/lib/asyncPool.ts`
- Test: `src/lib/asyncPool.test.ts`

**Step 1: Write the failing test**

```ts
import { retryWithBackoff } from "./asyncPool"

it("retries when predicate matches", async () => {
  let calls = 0
  const result = await retryWithBackoff(
    async () => {
      calls += 1
      if (calls < 3) throw new Error("RATE_LIMIT")
      return "ok"
    },
    {
      retries: 2,
      shouldRetry: (error) => error instanceof Error && error.message === "RATE_LIMIT",
      baseDelayMs: 5,
    }
  )

  expect(result).toBe("ok")
  expect(calls).toBe(3)
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/asyncPool.test.ts`  
Expected: FAIL (missing `retryWithBackoff`).

**Step 3: Write minimal implementation**

```ts
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: {
    retries: number
    shouldRetry: (error: unknown) => boolean
    baseDelayMs?: number
  }
) => { /* ... */ }
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/asyncPool.test.ts`  
Expected: PASS.

**Step 5: Commit**

```bash
git add src/lib/asyncPool.ts src/lib/asyncPool.test.ts
git commit -m "feat: add retry helper"
```

### Task 3: Commission Page Concurrency Integration

**Files:**
- Modify: `src/components/commission/CommissionPageContent.tsx:730-900`
- (Optional) Modify: `src/components/commission/CommissionPageContent.test.tsx`

**Step 1: Write the failing test**

If adding coverage, extend `CommissionPageContent.test.tsx` to mock `getPinnedComments` and verify that multiple video links trigger product fetches and progress updates. Otherwise note that integration is covered by helper tests + manual verification.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/commission/CommissionPageContent.test.tsx`  
Expected: FAIL if new assertions added; otherwise skip.

**Step 3: Write minimal implementation**

```ts
import { createAsyncQueue, retryWithBackoff, runQueueWithConcurrency, runWithConcurrency } from "@/lib/asyncPool"
import { BiliApiError, getPinnedComments } from "@/lib/bilibili"

const VIDEO_CONCURRENCY = 4
const PRODUCT_CONCURRENCY = 8

const isRetryableBiliError = (error: unknown) => {
  if (error instanceof BiliApiError) {
    return ["-403", "-412", "-509", "-352", "-1202", "-1209"].includes(String(error.code))
  }
  return false
}

// inside handleParseComment:
const productQueue = createAsyncQueue<{ link: string; context: { sourceLink?: string; sourceAuthor?: string } }>()
const productTracker = { total: 0, processed: 0 }
const productRunner = runQueueWithConcurrency(productQueue, PRODUCT_CONCURRENCY, async ({ link, context }) => {
  // existing fetchCommissionProduct + dedupe logic
  productTracker.processed += 1
  setProgress({ current: productTracker.processed, total: productTracker.total })
})

await runWithConcurrency(uniqueVideos, VIDEO_CONCURRENCY, async (link, index) => {
  setProgressMessage(`正在获取评论 (${index + 1}/${uniqueVideos.length})`)
  const commentData = await retryWithBackoff(
    () => getPinnedComments(link),
    { retries: 2, shouldRetry: isRetryableBiliError, baseDelayMs: 500 }
  )
  // extract links -> productQueue.push(...)
  productTracker.total += uniqueLinks.length
  setProgress({ current: productTracker.processed, total: productTracker.total })
})

productQueue.close()
await productRunner
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/commission/CommissionPageContent.test.tsx`  
Expected: PASS (or existing tests unchanged).

**Step 5: Commit**

```bash
git add src/components/commission/CommissionPageContent.tsx
git commit -m "feat: add concurrency to pinned comment extraction"
```

### Task 4: Manual Verification

**Step 1: Smoke test in dev UI**

Run app and try 5–10 Bilibili links.  
Expected: progress jumps faster, no regression in extracted item list.

**Step 2: Error handling**

Use one invalid link + some valid links.  
Expected: invalid link recorded in failed list, flow continues.

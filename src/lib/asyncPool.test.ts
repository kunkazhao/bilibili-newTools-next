import { describe, expect, it } from "vitest"
import {
  createAsyncQueue,
  retryWithBackoff,
  runQueueWithConcurrency,
  runWithConcurrency,
} from "./asyncPool"

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

describe("retryWithBackoff", () => {
  it("retries when predicate matches", async () => {
    let calls = 0
    const result = await retryWithBackoff(
      async () => {
        calls += 1
        if (calls < 3) {
          throw new Error("RATE_LIMIT")
        }
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
})

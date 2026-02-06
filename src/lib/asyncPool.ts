export type AsyncQueue<T> = {
  push: (item: T) => void
  close: () => void
  next: () => Promise<IteratorResult<T>>
}

export const runWithConcurrency = async <T>(
  items: T[],
  limit: number,
  handler: (item: T, index: number) => Promise<void>
) => {
  const queue = items.map((item, index) => ({ item, index }))
  const safeLimit = Math.max(1, limit)
  const workerCount = Math.min(safeLimit, queue.length || safeLimit)
  const workers = Array.from({ length: workerCount }, async () => {
    while (queue.length) {
      const nextItem = queue.shift()
      if (!nextItem) break
      await handler(nextItem.item, nextItem.index)
    }
  })
  await Promise.all(workers)
}

export const createAsyncQueue = <T>(): AsyncQueue<T> => {
  const items: T[] = []
  const waiters: Array<(value: IteratorResult<T>) => void> = []
  let closed = false

  const flushWaiters = (result: IteratorResult<T>) => {
    while (waiters.length) {
      const waiter = waiters.shift()
      if (waiter) waiter(result)
    }
  }

  return {
    push(item: T) {
      if (closed) return
      const waiter = waiters.shift()
      if (waiter) {
        waiter({ value: item, done: false })
        return
      }
      items.push(item)
    },
    close() {
      if (closed) return
      closed = true
      flushWaiters({ value: undefined as T, done: true })
    },
    async next() {
      if (items.length) {
        return { value: items.shift() as T, done: false }
      }
      if (closed) {
        return { value: undefined as T, done: true }
      }
      return await new Promise<IteratorResult<T>>((resolve) => {
        waiters.push(resolve)
      })
    },
  }
}

export const runQueueWithConcurrency = async <T>(
  queue: AsyncQueue<T>,
  limit: number,
  handler: (item: T) => Promise<void>
) => {
  const safeLimit = Math.max(1, limit)
  const workers = Array.from({ length: safeLimit }, async () => {
    while (true) {
      const { value, done } = await queue.next()
      if (done) break
      await handler(value)
    }
  })
  await Promise.all(workers)
}

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: {
    retries: number
    shouldRetry: (error: unknown) => boolean
    baseDelayMs?: number
  }
) => {
  const baseDelayMs = options.baseDelayMs ?? 300
  let attempt = 0
  while (true) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= options.retries || !options.shouldRetry(error)) {
        throw error
      }
      const delayMs = baseDelayMs * Math.max(1, attempt + 1)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      attempt += 1
    }
  }
}

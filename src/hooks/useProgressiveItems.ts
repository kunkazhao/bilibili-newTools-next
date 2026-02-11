import { useEffect, useMemo, useRef, useState } from "react"

interface ProgressiveItemsOptions {
  initialCount?: number
  chunkSize?: number
  resetKey?: string
}

interface ProgressiveItemsResult<T> {
  visibleItems: T[]
  visibleCount: number
  hasPending: boolean
}

const DEFAULT_INITIAL_COUNT = 30
const DEFAULT_CHUNK_SIZE = 30

export function useProgressiveItems<T>(
  items: T[],
  options: ProgressiveItemsOptions = {}
): ProgressiveItemsResult<T> {
  const initialCount = options.initialCount ?? DEFAULT_INITIAL_COUNT
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE
  const [visibleCount, setVisibleCount] = useState(initialCount)
  const prevLengthRef = useRef(items.length)
  const prevResetKeyRef = useRef(options.resetKey)

  useEffect(() => {
    if (options.resetKey !== prevResetKeyRef.current) {
      prevResetKeyRef.current = options.resetKey
      prevLengthRef.current = items.length
      setVisibleCount(initialCount)
      return
    }

    if (items.length < prevLengthRef.current) {
      setVisibleCount(initialCount)
    } else if (items.length === 0) {
      setVisibleCount(initialCount)
    }

    prevLengthRef.current = items.length
  }, [initialCount, items.length, options.resetKey])

  useEffect(() => {
    if (visibleCount >= items.length) return

    let cancelled = false
    let timerId: ReturnType<typeof setTimeout> | null = null
    let idleId: number | null = null

    const schedule = () => {
      if (cancelled) return
      setVisibleCount((prev) => {
        if (prev >= items.length) return prev
        return Math.min(prev + chunkSize, items.length)
      })
    }

    const win =
      typeof window !== "undefined"
        ? (window as Window & {
            requestIdleCallback?: (
              callback: IdleRequestCallback,
              options?: IdleRequestOptions
            ) => number
            cancelIdleCallback?: (handle: number) => void
          })
        : null

    if (win?.requestIdleCallback) {
      idleId = win.requestIdleCallback(schedule, { timeout: 160 })
    } else {
      timerId = setTimeout(schedule, 16)
    }

    return () => {
      cancelled = true
      if (timerId !== null) {
        clearTimeout(timerId)
      }
      if (idleId !== null) {
        const cancelIdle = (window as Window & { cancelIdleCallback?: (handle: number) => void })
          .cancelIdleCallback
        cancelIdle?.(idleId)
      }
    }
  }, [chunkSize, items.length, visibleCount])

  const visibleItems = useMemo(
    () => items.slice(0, Math.min(visibleCount, items.length)),
    [items, visibleCount]
  )

  return {
    visibleItems,
    visibleCount,
    hasPending: visibleItems.length < items.length,
  }
}

import { describe, expect, it } from "vitest"
import {
  ARCHIVE_LIST_ROW_GAP,
  ARCHIVE_LIST_ROW_HEIGHT,
  getVirtualItemCount,
  isLoadMoreRow,
  resolveListViewportHeight,
  resolveRowHeight,
} from "./virtualList"

describe("virtual list helpers", () => {
  it("computes item count with load-more row", () => {
    expect(getVirtualItemCount(3, true, false)).toBe(4)
    expect(getVirtualItemCount(3, false, false)).toBe(3)
    expect(getVirtualItemCount(3, true, true)).toBe(3)
  })

  it("identifies the load-more row", () => {
    expect(isLoadMoreRow(3, 3, true, false)).toBe(true)
    expect(isLoadMoreRow(2, 3, true, false)).toBe(false)
    expect(isLoadMoreRow(3, 3, false, false)).toBe(false)
  })

  it("computes a safe viewport height", () => {
    expect(resolveListViewportHeight(900, 200)).toBeGreaterThanOrEqual(320)
    expect(resolveListViewportHeight(500, 400)).toBe(320)
  })

  it("exposes fixed row height", () => {
    expect(ARCHIVE_LIST_ROW_GAP).toBe(2)
    expect(ARCHIVE_LIST_ROW_HEIGHT).toBe(362)
  })

  it("derives row height from measured card height", () => {
    expect(resolveRowHeight(383.25, ARCHIVE_LIST_ROW_GAP, ARCHIVE_LIST_ROW_HEIGHT)).toBe(386)
    expect(resolveRowHeight(0, ARCHIVE_LIST_ROW_GAP, ARCHIVE_LIST_ROW_HEIGHT)).toBe(
      ARCHIVE_LIST_ROW_HEIGHT
    )
  })
})

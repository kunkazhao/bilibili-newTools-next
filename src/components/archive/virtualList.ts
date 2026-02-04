export const ARCHIVE_LIST_ROW_GAP = 2
export const ARCHIVE_LIST_ROW_HEIGHT = 362
const MIN_LIST_HEIGHT = 320
const LIST_BOTTOM_GAP = 24

export const getVirtualItemCount = (
  itemsLength: number,
  hasMore: boolean,
  disableLoadMore: boolean
) => itemsLength + (hasMore && !disableLoadMore ? 1 : 0)

export const isLoadMoreRow = (
  index: number,
  itemsLength: number,
  hasMore: boolean,
  disableLoadMore: boolean
) => hasMore && !disableLoadMore && index === itemsLength

export const resolveListViewportHeight = (
  viewportHeight: number,
  containerTop: number
) => {
  const height = viewportHeight - containerTop - LIST_BOTTOM_GAP
  return Math.max(MIN_LIST_HEIGHT, height)
}

export const resolveRowHeight = (
  cardHeight: number,
  gap: number,
  minHeight: number
) => {
  if (!Number.isFinite(cardHeight) || cardHeight <= 0) return minHeight
  return Math.max(minHeight, Math.ceil(cardHeight + gap))
}

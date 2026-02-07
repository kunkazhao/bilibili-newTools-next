export interface PaginationResponse {
  has_more: boolean
  next_offset: number
}

export interface ErrorResponse {
  detail?: string
  message?: string
}

export interface SpecField {
  key: string
  value?: string
  example?: string
}

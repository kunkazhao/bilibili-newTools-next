const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? ""

export interface ApiRequestOptions extends RequestInit {
  timeout?: number
}

type ApiErrorInit = {
  code: string
  status?: number
  detail?: unknown
}

export class ApiError extends Error {
  code: string
  status?: number
  detail?: unknown

  constructor(message: string, init: ApiErrorInit) {
    super(message)
    this.name = "ApiError"
    this.code = init.code
    this.status = init.status
    this.detail = init.detail
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    timeout = 30000,
    headers,
    body,
    signal: externalSignal,
    ...fetchOptions
  } = options

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  const requestHeaders = new Headers(headers ?? {})
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData

  if (!isFormData && body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json")
  }

  const abortByExternalSignal = () => controller.abort()

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort()
    } else {
      externalSignal.addEventListener("abort", abortByExternalSignal, { once: true })
    }
  }

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      body,
      headers: requestHeaders,
      signal: controller.signal,
    })

    if (response.status === 204) {
      return {} as T
    }

    const text = await response.text()
    const data = text ? safeJson(text) : {}

    if (!response.ok) {
      const errorPayload = parseApiErrorPayload(data, text, response.status)
      throw new ApiError(errorPayload.message, {
        code: errorPayload.code,
        status: response.status,
        detail: data,
      })
    }

    return data as T
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if ((error as { name?: string })?.name === "AbortError") {
      throw new ApiError(`请求超时（${timeout}ms）`, {
        code: "REQUEST_TIMEOUT",
        status: 408,
      })
    }

    if (error instanceof TypeError) {
      throw new ApiError("网络连接异常", {
        code: "NETWORK_ERROR",
      })
    }

    throw error
  } finally {
    clearTimeout(timeoutId)
    externalSignal?.removeEventListener("abort", abortByExternalSignal)
  }
}

function parseApiErrorPayload(data: unknown, rawText: string, status: number) {
  const payload = asRecord(data)
  const detail = payload?.detail
  const detailRecord = asRecord(detail)

  const code =
    readString(payload?.code) ?? readString(detailRecord?.code) ?? `HTTP_${status}`

  const fallback = rawText.trim() || `请求失败（${status}）`
  const message =
    readString(payload?.message) ??
    readString(detailRecord?.message) ??
    readString(detail) ??
    fallback

  return { code, message }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null
  return value as Record<string, unknown>
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

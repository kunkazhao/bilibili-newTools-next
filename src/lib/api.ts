const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? ""

export interface ApiRequestOptions extends RequestInit {
  timeout?: number
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
      const detail = (data as { detail?: string; message?: string })?.detail
      const message = detail || (data as { message?: string })?.message
      const fallback = text.trim()
      throw new Error(message || fallback || `请求失败（${response.status}）`)
    }

    return data as T
  } catch (error) {
    if ((error as { name?: string })?.name === "AbortError") {
      throw new Error(`请求超时（${timeout}ms）`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
    externalSignal?.removeEventListener("abort", abortByExternalSignal)
  }
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

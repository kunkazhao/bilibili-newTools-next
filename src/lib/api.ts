const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? ""

export async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  })
  const text = await response.text()
  const data = text ? safeJson(text) : {}
  if (!response.ok) {
    const detail = (data as { detail?: string; message?: string })?.detail
    const message = detail || (data as { message?: string })?.message
    throw new Error(message || `请求失败（${response.status}）`)
  }
  return data as T
}

function safeJson(raw: string) {
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

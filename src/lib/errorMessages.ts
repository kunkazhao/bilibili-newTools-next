const CODE_MESSAGE_MAP: Record<string, string> = {
  REQUEST_TIMEOUT: "请求超时，请稍后重试",
  NETWORK_ERROR: "网络异常，请检查网络后重试",
}

const STATUS_MESSAGE_MAP: Record<number, string> = {
  400: "请求参数有误，请检查后重试",
  401: "登录状态已失效，请重新登录",
  403: "暂无权限执行该操作",
  404: "请求资源不存在或已删除",
  409: "数据已变更，请刷新后重试",
  422: "提交内容不符合要求，请检查后重试",
  429: "请求过于频繁，请稍后重试",
  500: "服务暂时不可用，请稍后重试",
  502: "服务暂时不可用，请稍后重试",
  503: "服务暂时不可用，请稍后重试",
  504: "服务响应超时，请稍后重试",
}

const ENGLISH_MESSAGE_MAP: Record<string, string> = {
  "Question not found": "问题不存在或已删除",
  "Update failed": "更新失败，请稍后重试",
  "Add question failed": "添加问题失败，请稍后重试",
}

const TECHNICAL_PATTERNS = [
  /traceback/i,
  /stack\s*trace/i,
  /sqlstate/i,
  /exception:/i,
  /syntaxerror/i,
  /<!doctype html>/i,
]

const CHINESE_PATTERN = /[\u4e00-\u9fa5]/
const ASCII_ONLY_PATTERN = /^[\x20-\x7E]+$/

type ApiErrorLike = Error & {
  code: string
  status?: number
}

export function getUserErrorMessage(error: unknown, fallback: string): string {
  if (isApiErrorLike(error)) {
    const codeMessage = CODE_MESSAGE_MAP[error.code]
    if (codeMessage) return codeMessage

    const friendly = sanitizeRawMessage(error.message)
    if (friendly) return friendly

    if (typeof error.status === "number") {
      const statusMessage = STATUS_MESSAGE_MAP[error.status]
      if (statusMessage) return statusMessage
    }

    return fallback
  }

  if (error instanceof Error) {
    const friendly = sanitizeRawMessage(error.message)
    return friendly ?? fallback
  }

  return fallback
}

function isApiErrorLike(error: unknown): error is ApiErrorLike {
  if (!error || typeof error !== "object") return false
  const target = error as { code?: unknown; message?: unknown }
  return typeof target.code === "string" && typeof target.message === "string"
}

function sanitizeRawMessage(message: string): string | null {
  const trimmed = message.trim()
  if (!trimmed) return null

  if (ENGLISH_MESSAGE_MAP[trimmed]) {
    return ENGLISH_MESSAGE_MAP[trimmed]
  }

  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return null
  }

  if (trimmed.length > 120) {
    return CHINESE_PATTERN.test(trimmed) ? `${trimmed.slice(0, 117)}...` : null
  }

  if (ASCII_ONLY_PATTERN.test(trimmed) && !CHINESE_PATTERN.test(trimmed)) {
    return null
  }

  return trimmed
}

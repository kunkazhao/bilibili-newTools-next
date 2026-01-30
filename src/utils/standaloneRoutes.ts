export const buildSchemeDetailUrl = (schemeId: string, baseUrl?: string) => {
  const resolvedBase =
    baseUrl ?? `${window.location.origin}${window.location.pathname}`
  const url = new URL(resolvedBase)
  url.searchParams.set("schemeId", schemeId)
  url.searchParams.set("standalone", "1")
  return url.toString()
}

export const getStandaloneSchemeId = (search: string) => {
  const params = new URLSearchParams(search)
  const schemeId = params.get("schemeId")
  const standalone = params.get("standalone")
  if (!schemeId) return null
  if (standalone !== "1" && standalone !== "true") return null
  return schemeId
}

export const openSchemeDetailPage = (
  schemeId: string,
  options?: {
    baseUrl?: string
    open?: (url: string, target?: string) => Window | null
    fallback?: (url: string) => void
  }
) => {
  const url = buildSchemeDetailUrl(schemeId, options?.baseUrl)
  const opener = options?.open ?? window.open
  const fallback = options?.fallback ?? ((nextUrl: string) => {
    window.location.href = nextUrl
  })

  const opened = opener ? opener(url, "_blank") : null
  if (!opened) {
    fallback(url)
  }
}

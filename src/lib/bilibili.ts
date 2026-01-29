const API_BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? ""

export class BiliApiError extends Error {
  code?: number | string
  constructor(message: string, code?: number | string) {
    super(message)
    this.name = "BiliApiError"
    this.code = code
  }
}

const getBiliErrorMessage = (code: number | string, message?: string) => {
  const errorMap: Record<string, string> = {
    "-403": "该视频的评论无法访问（B站限制访问）",
    "-404": "视频不存在",
    "-400": "请求参数错误",
    "-412": "请求过快，请稍后再试",
    "-509": "请求频繁，请休息一下再试",
    "-352": "需要登录才能访问",
    "-111": "账号被封禁",
    "-1202": "账号未登录",
    "-1209": "风控检测，请稍后再试",
  }
  const friendly = errorMap[String(code)]
  if (friendly) return friendly
  if (message) return `B站API错误(${code}): ${message}`
  return `B站API返回错误码: ${code}`
}

const parseVideoUrl = (url: string) => {
  if (!url) return null
  const bvMatch = url.match(/BV([a-zA-Z0-9]+)/)
  if (bvMatch) return { type: "bv", id: bvMatch[0] }
  const avMatch = url.match(/av(\d+)/i)
  if (avMatch) return { type: "av", id: `av${avMatch[1]}` }
  return null
}

export const isBilibiliInput = (url: string) => {
  if (!url) return false
  return /bilibili\.com|b23\.tv|^BV[a-zA-Z0-9]+$|^av\d+$/i.test(url.trim())
}

const resolveVideoUrl = async (url: string) => {
  const trimmed = url.trim()
  const response = await fetch(
    `${API_BASE}/api/bilibili/resolve?url=${encodeURIComponent(trimmed)}`
  )
  if (!response.ok) {
    throw new Error("解析短链接失败")
  }
  const data = (await response.json()) as { resolvedUrl?: string }
  return data.resolvedUrl || trimmed
}

const fetchWithProxy = async (url: string) => {
  const response = await fetch(`${API_BASE}/api/bilibili/proxy`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const data = (await response.json()) as Record<string, any>
  if (data.detail) {
    throw new Error(data.detail)
  }
  if (typeof data.code === "number" && data.code !== 0) {
    throw new BiliApiError(getBiliErrorMessage(data.code, data.message), data.code)
  }
  return data
}

const getVideoInfoById = async (bvid: string) => {
  const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`
  const result = await fetchWithProxy(apiUrl)
  if (result.code !== 0) {
    throw new Error(`获取视频信息失败: ${result.message}`)
  }
  return result.data
}

const getVideoInfoByAid = async (aid: number) => {
  const apiUrl = `https://api.bilibili.com/x/web-interface/view?aid=${aid}`
  const result = await fetchWithProxy(apiUrl)
  if (result.code !== 0) {
    throw new Error(`获取视频信息失败: ${result.message}`)
  }
  return result.data
}

const getVideoDetail = async (parsedVideo: { type: string; id: string } | null) => {
  if (!parsedVideo) return null
  if (parsedVideo.type === "bv") {
    return await getVideoInfoById(parsedVideo.id)
  }
  if (parsedVideo.type === "av") {
    const aid = Number(parsedVideo.id.replace(/^av/i, ""))
    if (!aid) return null
    return await getVideoInfoByAid(aid)
  }
  return null
}

const getComments = async (oid: number, page = 1) => {
  const apiEndpoints = [
    `https://api.bilibili.com/x/v2/reply?type=1&oid=${oid}&pn=${page}`,
    `https://api.bilibili.com/x/v2/reply/main?type=1&oid=${oid}&pn=${page}`,
    `https://api.bilibili.com/x/v2/reply/wbi/main?type=1&oid=${oid}&pn=${page}`,
  ]

  for (const apiUrl of apiEndpoints) {
    try {
      const result = await fetchWithProxy(apiUrl)
      if (result.code === 0) {
        if (result.data?.top || result.data?.upper?.top) {
          return result
        }
      }
    } catch {
      // ignore and try next endpoint
    }
  }

  return await fetchWithProxy(apiEndpoints[0])
}

export type BilibiliPinnedResult = {
  pinnedComments: Record<string, any>[]
  subReplies: Record<string, any>[]
  videoInfo?: {
    aid?: number
    bvid?: string
    originalUrl?: string
    title?: string
    author?: string
    authorId?: string | number
  }
}

export const getPinnedComments = async (url: string): Promise<BilibiliPinnedResult> => {
  if (!url) {
    throw new Error("无法识别的视频链接")
  }

  let parsedUrl = url.trim()

  if (/^BV[a-zA-Z0-9]+$/i.test(parsedUrl)) {
    parsedUrl = `https://www.bilibili.com/video/${parsedUrl}`
  } else if (/^av\d+$/i.test(parsedUrl) && !parsedUrl.startsWith("https://")) {
    parsedUrl = `https://www.bilibili.com/video/${parsedUrl}`
  }

  if (parsedUrl.includes("b23.tv")) {
    try {
      parsedUrl = await resolveVideoUrl(parsedUrl)
    } catch {
      // ignore and use original
    }
  }

  const videoId = parseVideoUrl(parsedUrl)
  if (!videoId) {
    throw new Error("无法识别的视频链接格式")
  }

  let videoInfo = await getVideoDetail(videoId)
  if (!videoInfo || !videoInfo.aid) {
    const fallbackAid =
      videoId.type === "av" ? Number(videoId.id.replace(/^av/i, "")) : 0
    if (!fallbackAid) {
      throw new Error("无法获取视频详情")
    }
    videoInfo = { aid: fallbackAid, bvid: videoId.type === "bv" ? videoId.id : "" }
  }

  const commentsData = await getComments(videoInfo.aid)
  const pinnedComments: Record<string, any>[] = []
  const subReplies: Record<string, any>[] = []

  if (commentsData?.code === 0 && commentsData?.data) {
    let topComment = commentsData.data.top
    if (!topComment) {
      topComment = commentsData.data.upper?.top
    }
    if (topComment) {
      pinnedComments.push(topComment)
      try {
        const replyCount = parseInt(topComment.rcount) || 0
        if (Number(replyCount) > 0) {
          const rootId = topComment.rpid_str || String(topComment.rpid)
          const pageSize = 20
          const totalPages = Math.ceil(replyCount / pageSize)
          for (let page = 1; page <= totalPages; page += 1) {
            const apiEndpoints = [
              `https://api.bilibili.com/x/v2/reply/reply?type=1&oid=${videoInfo.aid}&root=${rootId}&pn=${page}`,
              `https://api.bilibili.com/x/v2/reply/main?type=1&oid=${videoInfo.aid}&root=${rootId}&pn=${page}`,
            ]
            let replyData: Record<string, any> | null = null
            for (const apiUrl of apiEndpoints) {
              try {
                const data = await fetchWithProxy(apiUrl)
                if (data.code === 0 && Array.isArray(data.data?.replies)) {
                  replyData = data
                  break
                }
              } catch {
                // ignore
              }
            }
            if (replyData?.data?.replies?.length) {
              subReplies.push(...replyData.data.replies)
            }
          }
        }
      } catch {
        // ignore
      }
    }

    if (pinnedComments.length === 0 && Array.isArray(commentsData.data.replies)) {
      pinnedComments.push(...commentsData.data.replies.slice(0, 3))
    }
  }

  return {
    pinnedComments,
    subReplies,
    videoInfo: {
      aid: videoInfo.aid,
      bvid: videoInfo.bvid || videoId.id,
      originalUrl: parsedUrl,
      title: videoInfo.title || "",
      author: videoInfo.owner?.name || "",
      authorId: videoInfo.owner?.mid || "",
    },
  }
}

export type CommentLinkMeta = {
  url: string
  title: string
  commenter: string
  commentText: string
}

export const extractLinksFromComment = (
  comment: Record<string, any>,
  options: { allowUnionClick?: boolean; allowTaobaoPromo?: boolean } = {}
): CommentLinkMeta[] => {
  const links: CommentLinkMeta[] = []
  const content = comment?.content?.message || ""
  const allowUnionClick = options.allowUnionClick === true
  const allowTaobaoPromo = options.allowTaobaoPromo === true

  const commenter = comment?.member?.uname || "未知用户"
  const commentSummary = content.trim().split(/\n/)[0] || ""

  const normalizeLink = (url: string) => {
    if (!url) return null
    const trimmed = url.trim()
    if (!trimmed) return null
    try {
      const parsed = new URL(trimmed)
      const hostname = parsed.hostname.toLowerCase()
      if (!allowUnionClick && hostname.includes("union-click.jd.com")) {
        return null
      }
      if (
        !allowTaobaoPromo &&
        (hostname.includes("click.taobao.com") || hostname.includes("uland.taobao.com"))
      ) {
        return null
      }
    } catch {
      const lower = trimmed.toLowerCase()
      if (
        (!allowUnionClick && lower.includes("union-click.jd.com")) ||
        (!allowTaobaoPromo &&
          (lower.includes("click.taobao.com") || lower.includes("uland.taobao.com")))
      ) {
        return null
      }
    }
    return trimmed
  }

  const pushLink = (url: string, customTitle = "") => {
    const normalized = normalizeLink(url)
    if (!normalized) return
    const title = customTitle || commentSummary || `${commenter}评论`
    links.push({
      url: normalized,
      title,
      commenter,
      commentText: content,
    })
  }

  const jdPattern = /https?:\/\/[^\s]*jd\.com[^\s]*/gi
  const jdMatches = content.match(jdPattern)
  if (jdMatches) {
    jdMatches.forEach((link) => pushLink(link))
  }

  const taobaoPattern = /https?:\/\/[^\s]*(taobao\.com|tmall\.com)[^\s]*/gi
  const taobaoMatches = content.match(taobaoPattern)
  if (taobaoMatches) {
    taobaoMatches.forEach((link) => pushLink(link))
  }

  const shortPattern = /https?:\/\/(?:b23\.tv|bili22\.cn|bili33\.cn|bili2233\.cn)\/[^\s]+/gi
  const shortMatches = content.match(shortPattern)
  if (shortMatches) {
    shortMatches.forEach((link) => pushLink(link))
  }

  if (comment?.content?.jump_url) {
    const jumpUrl = comment.content.jump_url
    for (const key in jumpUrl) {
      const item = jumpUrl[key]
      if (item?.pc_url) {
        if (
          item.pc_url.includes("jd.com") ||
          item.pc_url.includes("taobao.com") ||
          item.pc_url.includes("tmall.com")
        ) {
          const jumpTitle = item.title || item.word || ""
          pushLink(item.pc_url, jumpTitle)
        }
      }
    }
  }

  return links
}

export const buildComboContent = (result: BilibiliPinnedResult | null) => {
  if (!result) return "未获取到置顶评论"
  const fragments: string[] = []
  const skipLinePattern = /^【(视频|置顶)】/
  const urlPattern = /(https?:\/\/[^\s]+)/gi
  const processedComments = new Set<string>()

  const splitLine = (line: string, allowedLinks: Set<string>) => {
    const trimmed = line.trim()
    if (!trimmed || skipLinePattern.test(trimmed)) {
      return []
    }
    const pieces: string[] = []
    let lastIndex = 0
    let hasMatch = false
    urlPattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = urlPattern.exec(trimmed)) !== null) {
      hasMatch = true
      const before = trimmed.slice(lastIndex, match.index).trim()
      if (before) {
        pieces.push(before)
      }
      const candidate = match[0].trim()
      if (allowedLinks.has(candidate)) {
        pieces.push(candidate)
      }
      lastIndex = match.index + match[0].length
    }
    if (hasMatch) {
      const tail = trimmed.slice(lastIndex).trim()
      if (tail) {
        pieces.push(tail)
      }
    } else if (trimmed) {
      pieces.push(trimmed)
    }
    return pieces
  }

  const processComment = (comment: Record<string, any>) => {
    if (!comment) return
    const commentId =
      comment.rpid_str || comment.rpid || comment.id_str || comment.id || null
    if (commentId) {
      const key = String(commentId)
      if (processedComments.has(key)) return
      processedComments.add(key)
    }
    const text = comment.content?.message || ""
    if (!text) return
    const links = (extractLinksFromComment(comment) || []).map((item) => item.url.trim())
    const allowedLinks = new Set(links)
    const lines = text.replace(/\r?\n/g, "\n").split("\n")
    lines.forEach((line) => {
      splitLine(line, allowedLinks).forEach((fragment) => fragments.push(fragment))
    })
  }

  const pinned = Array.isArray(result.pinnedComments) ? result.pinnedComments : []
  pinned.forEach(processComment)

  const replies = Array.isArray(result.subReplies) ? result.subReplies : []
  replies.forEach((reply) => {
    processComment(reply)
    if (Array.isArray(reply.replies)) {
      reply.replies.forEach(processComment)
    }
  })

  const joined = fragments.join("\n").replace(/\n{2,}/g, "\n").trim()
  return joined || "未获取到有效评论"
}

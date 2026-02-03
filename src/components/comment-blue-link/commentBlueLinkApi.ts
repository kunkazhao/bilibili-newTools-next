import { apiRequest } from "@/lib/api"
import type { CommentAccount, CommentCombo } from "./types"

const COMMENT_STATE_V2 = "/api/comment/blue-links/state-v2"

export const fetchCommentBlueLinkState = async () =>
  apiRequest<{
    accounts: CommentAccount[]
    combos: CommentCombo[]
  }>(COMMENT_STATE_V2)

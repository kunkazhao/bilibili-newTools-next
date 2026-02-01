import { apiRequest } from "@/lib/api"
import type { CommentAccount, CommentCategory, CommentCombo } from "./types"

export const fetchCommentBlueLinkState = () =>
  apiRequest<{
    accounts: CommentAccount[]
    categories: CommentCategory[]
    combos: CommentCombo[]
  }>("/api/comment/blue-links/state-v2")

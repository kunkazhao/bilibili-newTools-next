# My Account Tool Design

Date: 2026-02-03
Owner: Codex
Scope: Sidebar "My Account" tool, account video sync via Bilibili WBI API

## Goal
Add a new sidebar utility tool "我的账号" that shows account info on the left and the account's videos on the right. Video data is fetched from Bilibili account pages via official API (WBI signed) and cached in Supabase. Provide a "获取最新视频" action to sync and update when new videos appear.

## Decisions
- Reuse existing account table `comment_accounts`, add `homepage_link` column.
- Add a new `account_videos` table to store and de-duplicate fetched videos.
- Use Bilibili WBI API for stable structured data (no HTML parsing).
- Frontend reuses existing sidebar and benchmark video card styles.

## Data Model
### comment_accounts
- Add: `homepage_link` (text, nullable)

### account_videos
- id (uuid, pk, default gen_random_uuid())
- account_id (uuid, FK comment_accounts.id)
- bvid (text)
- title (text)
- link (text)
- cover (text)
- author (text)
- duration (int)
- pub_time (timestamptz)
- stats (jsonb)
- payload (jsonb)
- created_at, updated_at (timestamptz)

Unique index: (account_id, bvid)

## Backend API
- `GET /api/my-accounts/state?account_id=...`
  - returns { accounts, videos }
  - videos sorted by pub_time desc
- `POST /api/my-accounts/sync`
  - body: { account_id }
  - resolves mid from homepage_link
  - calls WBI API `x/space/wbi/arc/search` (order=pubdate)
  - upserts videos into `account_videos`
  - returns { added, updated, videos }

## Frontend UI
- Sidebar entry: "我的账号" under 小工具
- Page layout: two columns
  - Left: account list + count, reuse sidebar styles from CommentBlueLink/BlueLinkMap
  - Right: video cards, reuse BenchmarkPageView card layout
- Action: "获取最新视频" button
  - triggers sync endpoint
  - refreshes list and shows toast

## Error Handling
- Empty homepage_link -> block sync with a clear message
- Invalid homepage_link -> 400
- WBI failure -> toast error, keep cached list

## Testing
- Backend unit tests for homepage_link -> mid parsing
- Sync endpoint: upsert de-dup on (account_id, bvid)
- Frontend: account switch refreshes list; sync updates list

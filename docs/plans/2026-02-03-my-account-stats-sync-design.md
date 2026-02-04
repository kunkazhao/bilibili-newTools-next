# My Account Video Stats Sync Design

**Goal:** Show like and favorite counts in the My Account video list by fetching per-video stat data during sync, while keeping existing view/reply/danmaku fallbacks.

**Scope:**
- Backend: extend sync to call Bilibili `/x/web-interface/archive/stat` by bvid, merge into `stats` for `account_videos` rows.
- Frontend: render favorite count in video card stats row and include it in types/tests.

**Backend approach:**
- Add a small async helper `fetch_account_video_stat(bvid)` that calls `https://api.bilibili.com/x/web-interface/archive/stat?bvid=...` with standard headers and a short timeout.
- In `sync_account_videos_for_account`, fetch vlist first, then for each item attempt to load stat data. If stat fetch fails, fall back to vlist fields (view/comment/danmaku) and keep like/favorite as null.
- Reuse `build_account_video_payload(..., stat)` to centralize the merge logic. Keep existing normalization for `danmaku` via `video_review` when stat is missing.

**Frontend approach:**
- Add `favorite` to the `AccountVideo` stats type.
- Render ` ’≤ÿ {formatNumber(video.stats?.favorite)}` alongside view/like/reply/danmaku in the card.
- Update the view test to assert favorite count rendering.

**Error handling:**
- Stat fetch errors should not fail the entire sync; log/skip and continue.
- Use conservative timeouts and a small retry (if already used elsewhere for Bili fetches).

**Testing:**
- Add a backend unit test to ensure sync uses stat values (like/favorite) when provided.
- Update/extend frontend tests to cover favorite rendering.

# Zhihu Radar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement Zhihu keyword monitoring with daily scraping, storage, and dashboard UI.

**Architecture:** FastAPI + Supabase tables for keywords/questions/stats. APScheduler triggers Playwright-based scraping at 05:00 Asia/Shanghai. Frontend adds a new page that reuses existing category UI styles and table component.

**Tech Stack:** FastAPI, Supabase REST, APScheduler, Playwright (Python), React + Tailwind + lucide, existing Table/ModalForm components.

---

### Task 1: Add backend route existence test (failing)

**Files:**
- Create: `backend/tests/test_zhihu_routes.py`

**Step 1: Write the failing test**

```python
import sys
from pathlib import Path
import unittest

from fastapi.routing import APIRoute

sys.path.append(str(Path(__file__).resolve().parents[1]))

from main import app


def has_route(path: str, methods=None) -> bool:
    methods = {m.upper() for m in (methods or {"GET"})}
    for route in app.routes:
        if isinstance(route, APIRoute) and route.path == path:
            route_methods = {m.upper() for m in (route.methods or set())}
            if methods.issubset(route_methods):
                return True
    return False


class ZhihuRouteTests(unittest.TestCase):
    def test_routes_exist(self):
        self.assertTrue(has_route("/api/zhihu/keywords", {"GET"}))
        self.assertTrue(has_route("/api/zhihu/keywords", {"POST"}))
        self.assertTrue(has_route("/api/zhihu/keywords/{keyword_id}", {"PATCH"}))
        self.assertTrue(has_route("/api/zhihu/keywords/{keyword_id}", {"DELETE"}))
        self.assertTrue(has_route("/api/zhihu/questions", {"GET"}))
        self.assertTrue(has_route("/api/zhihu/questions/{question_id}/stats", {"GET"}))
        self.assertTrue(has_route("/api/zhihu/scrape/run", {"POST"}))


if __name__ == "__main__":
    unittest.main()
```

**Step 2: Run test to verify it fails**

Run: `python backend/tests/test_zhihu_routes.py`
Expected: FAIL (routes missing)

**Step 3: Commit**

```bash
git add backend/tests/test_zhihu_routes.py
git commit -m "test: add zhihu route checks"
```

---

### Task 2: Add Supabase migration for Zhihu tables

**Files:**
- Create: `supabase/migrations/2026_02_04_add_zhihu_radar_tables.sql`

**Step 1: Write the migration**

```sql
create table if not exists zhihu_keywords (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists zhihu_questions (
  id text primary key,
  title text not null,
  url text not null,
  first_keyword_id uuid null references zhihu_keywords(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists zhihu_question_keywords (
  question_id text not null references zhihu_questions(id) on delete cascade,
  keyword_id uuid not null references zhihu_keywords(id) on delete cascade,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (question_id, keyword_id)
);

create table if not exists zhihu_question_stats (
  id uuid primary key default gen_random_uuid(),
  question_id text not null references zhihu_questions(id) on delete cascade,
  stat_date date not null,
  view_count bigint not null,
  answer_count bigint not null,
  fetched_at timestamptz not null default now(),
  unique (question_id, stat_date)
);

create index if not exists zhihu_question_stats_date_idx on zhihu_question_stats(stat_date);
create index if not exists zhihu_question_stats_question_idx on zhihu_question_stats(question_id);
create index if not exists zhihu_questions_keyword_idx on zhihu_questions(first_keyword_id);
```

**Step 2: Apply migration**

Run via MCP: `mcp__supabase__apply_migration` with name `add_zhihu_radar_tables` and the SQL above.

**Step 3: Commit**

```bash
git add supabase/migrations/2026_02_04_add_zhihu_radar_tables.sql
git commit -m "db: add zhihu radar tables"
```

---

### Task 3: Implement Zhihu keyword + list + trend APIs (pass Task 1)

**Files:**
- Modify: `backend/main.py`

**Step 1: Add helper types and env vars** (place near other env vars/models)

```python
ZHIHU_COOKIE = os.getenv("ZHIHU_COOKIE", "")
ZHIHU_UA = os.getenv(
    "ZHIHU_UA",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
)
ZHIHU_TIMEZONE = ZoneInfo("Asia/Shanghai")

class ZhihuKeywordPayload(BaseModel):
    name: str

class ZhihuKeywordUpdate(BaseModel):
    name: Optional[str] = None
```

**Step 2: Add list helpers** (place near other normalize helpers)

```python
def shanghai_today() -> date:
    return datetime.now(tz=ZHIHU_TIMEZONE).date()

async def fetch_zhihu_keywords_map(client: SupabaseClient) -> Dict[str, str]:
    rows = await client.select("zhihu_keywords", params={"select": "id,name"})
    return {str(row.get("id")): row.get("name") or "" for row in rows}
```

**Step 3: Add keyword CRUD routes** (place near other CRUD sections)

```python
@app.get("/api/zhihu/keywords")
async def list_zhihu_keywords():
    client = ensure_supabase()
    rows = await client.select("zhihu_keywords", params={"order": "created_at.asc"})
    return {"keywords": rows}

@app.post("/api/zhihu/keywords")
async def create_zhihu_keyword(payload: ZhihuKeywordPayload):
    client = ensure_supabase()
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="关键词不能为空")
    body = {"name": name, "created_at": utc_now_iso(), "updated_at": utc_now_iso()}
    try:
        record = await client.insert("zhihu_keywords", body)
    except SupabaseError as exc:
        status = 400 if exc.status_code in (400, 409) else 500
        raise HTTPException(status_code=status, detail=str(exc.message))
    return {"keyword": record[0]}

@app.patch("/api/zhihu/keywords/{keyword_id}")
async def update_zhihu_keyword(keyword_id: str, payload: ZhihuKeywordUpdate):
    client = ensure_supabase()
    updates: Dict[str, Any] = {}
    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="关键词不能为空")
        updates["name"] = payload.name.strip()
    if not updates:
        return {"keyword": None}
    updates["updated_at"] = utc_now_iso()
    record = await client.update("zhihu_keywords", updates, {"id": f"eq.{keyword_id}"})
    if not record:
        raise HTTPException(status_code=404, detail="关键词不存在")
    return {"keyword": record[0]}

@app.delete("/api/zhihu/keywords/{keyword_id}")
async def delete_zhihu_keyword(keyword_id: str):
    client = ensure_supabase()
    existing = await client.select("zhihu_keywords", {"id": f"eq.{keyword_id}"})
    if not existing:
        raise HTTPException(status_code=404, detail="关键词不存在")
    await client.delete("zhihu_question_keywords", {"keyword_id": f"eq.{keyword_id}"})
    await client.delete("zhihu_keywords", {"id": f"eq.{keyword_id}"})
    await client.update("zhihu_questions", {"first_keyword_id": None}, {"first_keyword_id": f"eq.{keyword_id}"})
    return {"status": "ok"}
```

**Step 4: Add list + trend routes**

```python
@app.get("/api/zhihu/questions")
async def list_zhihu_questions(
    keyword_id: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    client = ensure_supabase()
    params = {"select": "id,title,url,first_keyword_id,created_at,updated_at,last_seen_at", "order": "updated_at.desc", "limit": limit, "offset": offset}
    if q:
        safe_q = q.replace("%", "").replace("*", "").strip()
        if safe_q:
            params["title"] = f"ilike.*{safe_q}*"
    if keyword_id:
        mapping = await client.select("zhihu_question_keywords", {"keyword_id": f"eq.{keyword_id}", "select": "question_id"})
        ids = [row.get("question_id") for row in mapping if row.get("question_id")]
        if not ids:
            return {"items": [], "total": 0}
        params["id"] = f"in.({','.join(ids)})"
    questions = await client.select("zhihu_questions", params)

    today = shanghai_today()
    yesterday = today - timedelta(days=1)
    ids = [row.get("id") for row in questions]
    stats_today = await client.select("zhihu_question_stats", {"question_id": f"in.({','.join(ids)})", "stat_date": f"eq.{today}", "select": "question_id,view_count,answer_count"}) if ids else []
    stats_yesterday = await client.select("zhihu_question_stats", {"question_id": f"in.({','.join(ids)})", "stat_date": f"eq.{yesterday}", "select": "question_id,view_count,answer_count"}) if ids else []

    today_map = {row["question_id"]: row for row in stats_today}
    yesterday_map = {row["question_id"]: row for row in stats_yesterday}
    keyword_map = await fetch_zhihu_keywords_map(client)

    items = []
    for row in questions:
        qid = row.get("id")
        today_row = today_map.get(qid, {})
        yesterday_row = yesterday_map.get(qid, {})
        view_total = int(today_row.get("view_count") or 0)
        answer_total = int(today_row.get("answer_count") or 0)
        view_delta = view_total - int(yesterday_row.get("view_count") or 0)
        answer_delta = answer_total - int(yesterday_row.get("answer_count") or 0)
        items.append({
            **row,
            "first_keyword": keyword_map.get(str(row.get("first_keyword_id")) or "", "未分类"),
            "view_count_total": view_total,
            "answer_count_total": answer_total,
            "view_count_delta": view_delta,
            "answer_count_delta": answer_delta,
        })
    return {"items": items, "total": len(items)}


@app.get("/api/zhihu/questions/{question_id}/stats")
async def get_zhihu_question_stats(question_id: str, days: int = 15):
    client = ensure_supabase()
    rows = await client.select("zhihu_question_stats", {
        "question_id": f"eq.{question_id}",
        "order": "stat_date.asc",
        "limit": days,
    })
    return {"stats": rows}
```

**Step 5: Run route test**

Run: `python backend/tests/test_zhihu_routes.py`
Expected: PASS

**Step 6: Commit**

```bash
git add backend/main.py
# keep previous test file staged
# commit both

git add backend/tests/test_zhihu_routes.py
git commit -m "feat: add zhihu keyword and list routes"
```

---

### Task 4: Add Playwright scraper + scheduler

**Files:**
- Modify: `backend/main.py`
- Modify: `requirements.txt`

**Step 1: Add dependencies**

Append to `requirements.txt`:
```
apscheduler>=3.10.4
playwright>=1.57.0
```

**Step 2: Add scraper helpers** (place near other helpers)

```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from playwright.async_api import async_playwright

zhihu_scheduler: Optional[AsyncIOScheduler] = None
zhihu_playwright = None
zhihu_browser = None

async def ensure_zhihu_browser():
    global zhihu_playwright, zhihu_browser
    if zhihu_browser:
        return zhihu_browser
    zhihu_playwright = await async_playwright().start()
    zhihu_browser = await zhihu_playwright.chromium.launch(headless=True)
    return zhihu_browser

async def close_zhihu_browser():
    global zhihu_playwright, zhihu_browser
    if zhihu_browser:
        await zhihu_browser.close()
        zhihu_browser = None
    if zhihu_playwright:
        await zhihu_playwright.stop()
        zhihu_playwright = None
```

**Step 3: Add scheduled job**

```python
async def zhihu_scrape_job():
    # TODO: implement scraping workflow
    pass

@app.on_event("startup")
async def init_supabase_client() -> None:
    ...
    init_zhihu_scheduler()


def init_zhihu_scheduler() -> None:
    global zhihu_scheduler
    if zhihu_scheduler:
        return
    zhihu_scheduler = AsyncIOScheduler(timezone=ZHIHU_TIMEZONE)
    zhihu_scheduler.add_job(zhihu_scrape_job, CronTrigger(hour=5, minute=0))
    zhihu_scheduler.start()

@app.on_event("shutdown")
async def shutdown_supabase_client() -> None:
    ...
    if zhihu_scheduler:
        zhihu_scheduler.shutdown(wait=False)
    await close_zhihu_browser()
```

**Step 4: Add manual trigger route**

```python
@app.post("/api/zhihu/scrape/run")
async def run_zhihu_scrape():
    asyncio.create_task(zhihu_scrape_job())
    return {"status": "started"}
```

**Step 5: Commit**

```bash
git add backend/main.py requirements.txt
git commit -m "feat: add zhihu scraper scaffolding"
```

---

### Task 5: Implement scraper logic (search + question stats)

**Files:**
- Modify: `backend/main.py`

**Step 1: Add cookie parser + context builder**

```python

def parse_cookie_header(cookie_value: str, domain: str) -> List[Dict[str, Any]]:
    items = []
    for part in cookie_value.split(";"):
        if "=" not in part:
            continue
        name, value = part.split("=", 1)
        name = name.strip()
        value = value.strip()
        if not name:
            continue
        items.append({"name": name, "value": value, "domain": domain, "path": "/"})
    return items
```

**Step 2: Implement search collection (offset 0/20/40)**

```python
async def fetch_search_results_for_keyword(keyword: str) -> List[Dict[str, Any]]:
    browser = await ensure_zhihu_browser()
    context = await browser.new_context(user_agent=ZHIHU_UA)
    if ZHIHU_COOKIE:
        await context.add_cookies(parse_cookie_header(ZHIHU_COOKIE, ".zhihu.com"))
    page = await context.new_page()
    search_url = f"https://www.zhihu.com/search?type=content&q={quote(keyword)}"
    await page.goto(search_url, wait_until="domcontentloaded")
    results: List[Dict[str, Any]] = []
    offsets = [0, 20, 40]
    for offset in offsets:
        try:
            response = await page.wait_for_response(lambda r: "api/v4/search_v3" in r.url and f"offset={offset}" in r.url, timeout=15000)
            data = await response.json()
            results.extend(data.get("data") or [])
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await page.wait_for_timeout(800)
        except Exception:
            continue
    await context.close()
    return results
```

**Step 3: Implement question stats fetch**

```python
async def fetch_question_stats(question_id: str) -> Optional[Dict[str, Any]]:
    browser = await ensure_zhihu_browser()
    context = await browser.new_context(user_agent=ZHIHU_UA)
    if ZHIHU_COOKIE:
        await context.add_cookies(parse_cookie_header(ZHIHU_COOKIE, ".zhihu.com"))
    page = await context.new_page()
    url = f"https://www.zhihu.com/question/{question_id}"
    try:
        await page.goto(url, wait_until="domcontentloaded")
        resp = await page.wait_for_response(lambda r: f"/api/v4/questions/{question_id}" in r.url, timeout=15000)
        data = await resp.json()
        return data
    finally:
        await context.close()
```

**Step 4: Implement `zhihu_scrape_job`**

```python
async def zhihu_scrape_job():
    client = ensure_supabase()
    keywords = await client.select("zhihu_keywords", params={"order": "created_at.asc"})
    if not keywords:
        return
    today = shanghai_today()
    now = utc_now_iso()
    for keyword in keywords:
        name = (keyword.get("name") or "").strip()
        if not name:
            continue
        items = await fetch_search_results_for_keyword(name)
        questions = []
        for item in items:
            obj = item.get("object") or {}
            if obj.get("type") != "question":
                continue
            q = obj.get("question") or {}
            qid = str(q.get("id") or "")
            title = q.get("title") or ""
            if not qid or not title:
                continue
            questions.append({"id": qid, "title": title, "url": f"https://www.zhihu.com/question/{qid}"})
        for q in questions:
            # upsert question
            existing = await client.select("zhihu_questions", {"id": f"eq.{q['id']}"})
            first_keyword_id = existing[0].get("first_keyword_id") if existing else None
            payload = {
                "id": q["id"],
                "title": q["title"],
                "url": q["url"],
                "first_keyword_id": first_keyword_id or keyword.get("id"),
                "updated_at": now,
                "last_seen_at": now,
            }
            if not existing:
                payload["created_at"] = now
            await client.request("POST", "zhihu_questions", params={"on_conflict": "id"}, json_payload=payload, prefer="resolution=merge-duplicates,return=representation")
            # upsert mapping
            await client.request("POST", "zhihu_question_keywords", params={"on_conflict": "question_id,keyword_id"}, json_payload={
                "question_id": q["id"],
                "keyword_id": keyword.get("id"),
                "last_seen_at": now,
                "first_seen_at": now,
            }, prefer="resolution=merge-duplicates,return=representation")

            detail = await fetch_question_stats(q["id"])
            if not detail:
                continue
            stat = {
                "question_id": q["id"],
                "stat_date": str(today),
                "view_count": int(detail.get("visit_count") or 0),
                "answer_count": int(detail.get("answer_count") or 0),
                "fetched_at": now,
            }
            await client.request("POST", "zhihu_question_stats", params={"on_conflict": "question_id,stat_date"}, json_payload=stat, prefer="resolution=merge-duplicates,return=representation")

    # cleanup
    cutoff = today - timedelta(days=15)
    await client.delete("zhihu_question_stats", {"stat_date": f"lt.{cutoff}"})
```

**Step 5: Commit**

```bash
git add backend/main.py
git commit -m "feat: implement zhihu scraping job"
```

---

### Task 6: Frontend page + APIs

**Files:**
- Create: `src/components/zhihu/zhihuApi.ts`
- Create: `src/components/zhihu/ZhihuRadarPageContent.tsx`
- Create: `src/components/zhihu/ZhihuRadarPageView.tsx`
- Create: `src/pages/ZhihuRadarPage.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/AppLayout.tsx`

**Step 1: Add API wrapper**

```ts
import { apiRequest } from "@/lib/api"

export const fetchZhihuKeywords = () =>
  apiRequest<{ keywords: Array<{ id: string; name: string }> }>("/api/zhihu/keywords")

export const createZhihuKeyword = (name: string) =>
  apiRequest<{ keyword: { id: string; name: string } }>("/api/zhihu/keywords", {
    method: "POST",
    body: JSON.stringify({ name }),
  })

export const updateZhihuKeyword = (id: string, name: string) =>
  apiRequest<{ keyword: { id: string; name: string } }>(`/api/zhihu/keywords/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  })

export const deleteZhihuKeyword = (id: string) =>
  apiRequest(`/api/zhihu/keywords/${id}`, { method: "DELETE" })

export const fetchZhihuQuestions = (params: { keywordId?: string; q?: string }) => {
  const query = new URLSearchParams()
  if (params.keywordId) query.set("keyword_id", params.keywordId)
  if (params.q) query.set("q", params.q)
  return apiRequest<{ items: any[]; total: number }>(`/api/zhihu/questions?${query.toString()}`)
}

export const fetchZhihuQuestionStats = (id: string) =>
  apiRequest<{ stats: Array<{ stat_date: string; view_count: number }> }>(
    `/api/zhihu/questions/${id}/stats?days=15`
  )
```

**Step 2: Add view + content** (reuse Archive sidebar styles and Table)

- Sidebar: copy classes from `ArchivePageView` for list + add button.
- Table: use `src/components/Table.tsx`.
- Trend icon: lucide `TrendingUp`.
- Modal: use `Dialog` from `ui/dialog` for trend chart placeholder.

**Step 3: Wire into App and AppLayout**

```tsx
// AppLayout: add "知乎流量雷达" to utilityItems
// App.tsx: add case for ZhihuRadarPage, adjust indexes
```

**Step 4: Commit**

```bash
git add src/components/zhihu src/pages/ZhihuRadarPage.tsx src/App.tsx src/components/AppLayout.tsx
git commit -m "feat: add zhihu radar page"
```

---

### Task 7: Verify

**Run backend route test**
```
python backend/tests/test_zhihu_routes.py
```
Expected: PASS

**Manual**
- Open app → “知乎流量雷达” → ensure category list + table render.
- Add keyword and refresh list.

---

Plan complete and saved to `docs/plans/2026-02-04-zhihu-radar-implementation.md`.

Two execution options:
1. Subagent-Driven (this session) – I dispatch a fresh subagent per task, review between tasks.
2. Parallel Session (separate) – Open new session with executing-plans and run tasks in batch.

Which approach?

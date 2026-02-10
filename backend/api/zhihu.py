import asyncio
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException

router = APIRouter()

try:
    import core as core
except Exception:
    from backend import core as core

SupabaseError = core.SupabaseError
ZhihuKeywordPayload = core.ZhihuKeywordPayload
ZhihuKeywordUpdate = core.ZhihuKeywordUpdate
ZhihuQuestionCreatePayload = core.ZhihuQuestionCreatePayload
ZhihuScrapeRunPayload = core.ZhihuScrapeRunPayload
create_zhihu_job_state = core.create_zhihu_job_state
extract_zhihu_question_id = core.extract_zhihu_question_id
fetch_supabase_count = core.fetch_supabase_count
get_zhihu_job_state = core.get_zhihu_job_state
invalidate_zhihu_keywords_map_cache = core.invalidate_zhihu_keywords_map_cache
strip_html_tags = core.strip_html_tags
zhihu_scrape_job = core.zhihu_scrape_job



def _core_attr(name):
    return getattr(core, name)


def ensure_supabase(*args, **kwargs):
    return _core_attr("ensure_supabase")(*args, **kwargs)


def fetch_question_stats(*args, **kwargs):
    return _core_attr("fetch_question_stats")(*args, **kwargs)


def fetch_zhihu_keywords_map(*args, **kwargs):
    return _core_attr("fetch_zhihu_keywords_map")(*args, **kwargs)


def shanghai_today(*args, **kwargs):
    return _core_attr("shanghai_today")(*args, **kwargs)


def utc_now_iso(*args, **kwargs):
    return _core_attr("utc_now_iso")(*args, **kwargs)

@router.get("/api/zhihu/keywords")
async def list_zhihu_keywords():
    client = ensure_supabase()
    rows = await client.select("zhihu_keywords", params={"order": "created_at.asc"})
    return {"keywords": rows}

@router.get("/api/zhihu/keywords/counts")
async def list_zhihu_keyword_counts():
    client = ensure_supabase()
    keywords, mappings, total = await asyncio.gather(
        client.select("zhihu_keywords", params={"select": "id"}),
        client.select("zhihu_question_keywords", params={"select": "keyword_id"}),
        fetch_supabase_count(client, "zhihu_questions"),
    )
    counts: Dict[str, int] = {}
    for row in mappings:
        keyword_id = row.get("keyword_id")
        if not keyword_id:
            continue
        key = str(keyword_id)
        counts[key] = counts.get(key, 0) + 1
    for keyword in keywords:
        keyword_id = keyword.get("id")
        if not keyword_id:
            continue
        counts.setdefault(str(keyword_id), 0)
    return {"counts": counts, "total": total}

@router.post("/api/zhihu/keywords")
async def create_zhihu_keyword(payload: ZhihuKeywordPayload):
    client = ensure_supabase()
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="关键词名称不能为空")
    body = {"name": name, "created_at": utc_now_iso(), "updated_at": utc_now_iso()}
    try:
        record = await client.insert("zhihu_keywords", body)
        invalidate_zhihu_keywords_map_cache()
    except SupabaseError as exc:
        status = 400 if exc.status_code in (400, 409) else 500
        raise HTTPException(status_code=status, detail=str(exc.message))
    return {"keyword": record[0]}

@router.patch("/api/zhihu/keywords/{keyword_id}")
async def update_zhihu_keyword(keyword_id: str, payload: ZhihuKeywordUpdate):
    client = ensure_supabase()
    updates: Dict[str, Any] = {}
    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="关键词名称不能为空")
        updates["name"] = payload.name.strip()
    if not updates:
        return {"keyword": None}
    updates["updated_at"] = utc_now_iso()
    record = await client.update("zhihu_keywords", updates, {"id": f"eq.{keyword_id}"})
    if not record:
        raise HTTPException(status_code=404, detail="关键词不存在")
    invalidate_zhihu_keywords_map_cache()
    return {"keyword": record[0]}

@router.delete("/api/zhihu/keywords/{keyword_id}")
async def delete_zhihu_keyword(keyword_id: str):
    client = ensure_supabase()
    existing = await client.select("zhihu_keywords", {"id": f"eq.{keyword_id}"})
    if not existing:
        raise HTTPException(status_code=404, detail="关键词不存在")
    await client.delete("zhihu_question_keywords", {"keyword_id": f"eq.{keyword_id}"})
    await client.delete("zhihu_keywords", {"id": f"eq.{keyword_id}"})
    await client.update("zhihu_questions", {"first_keyword_id": None}, {"first_keyword_id": f"eq.{keyword_id}"})
    invalidate_zhihu_keywords_map_cache()
    return {"status": "ok"}

@router.post("/api/zhihu/questions")
async def create_zhihu_question(payload: ZhihuQuestionCreatePayload):
    client = ensure_supabase()
    keyword_id = payload.keyword_id.strip()
    question_url = payload.question_url.strip()

    if not keyword_id:
        raise HTTPException(status_code=400, detail="keyword_id is required")
    if not question_url:
        raise HTTPException(status_code=400, detail="question_url is required")

    keyword_rows = await client.select(
        "zhihu_keywords",
        {"id": f"eq.{keyword_id}", "select": "id,name", "limit": 1},
    )
    if not keyword_rows:
        raise HTTPException(status_code=404, detail="Keyword not found")

    question_id = extract_zhihu_question_id(question_url)
    if not question_id:
        raise HTTPException(status_code=400, detail="Invalid Zhihu question URL")

    existing_rows = await client.select(
        "zhihu_questions",
        {"id": f"eq.{question_id}", "limit": 1},
    )
    existing_row = existing_rows[0] if existing_rows else {}

    detail = await fetch_question_stats(question_id)
    if not detail:
        raise HTTPException(status_code=502, detail="Failed to fetch question stats")

    title = strip_html_tags(str(detail.get("title") or "")).strip() or str(
        existing_row.get("title") or ""
    ).strip()
    if not title:
        raise HTTPException(status_code=502, detail="Failed to fetch question title")

    now_value = utc_now_iso()
    stat_date = str(shanghai_today())
    canonical_url = f"https://www.zhihu.com/question/{question_id}"
    first_keyword_id = str(existing_row.get("first_keyword_id") or keyword_id)
    is_new = not bool(existing_row)

    question_payload: Dict[str, Any] = {
        "id": question_id,
        "title": title,
        "url": canonical_url,
        "first_keyword_id": first_keyword_id,
        "updated_at": now_value,
        "last_seen_at": now_value,
    }
    if is_new:
        question_payload["created_at"] = now_value

    stat_payload = {
        "question_id": question_id,
        "stat_date": stat_date,
        "view_count": int(detail.get("visit_count") or 0),
        "answer_count": int(detail.get("answer_count") or 0),
        "fetched_at": now_value,
    }

    try:
        await client.request(
            "POST",
            "zhihu_questions",
            params={"on_conflict": "id"},
            json_payload=question_payload,
            prefer="resolution=merge-duplicates,return=representation",
        )
        await client.request(
            "POST",
            "zhihu_question_keywords",
            params={"on_conflict": "question_id,keyword_id"},
            json_payload={
                "question_id": question_id,
                "keyword_id": keyword_id,
                "first_seen_at": now_value,
                "last_seen_at": now_value,
            },
            prefer="resolution=merge-duplicates,return=representation",
        )
        await client.request(
            "POST",
            "zhihu_question_stats",
            params={"on_conflict": "question_id,stat_date"},
            json_payload=stat_payload,
            prefer="resolution=merge-duplicates,return=representation",
        )
    except SupabaseError as exc:
        status_code = exc.status_code if 400 <= int(exc.status_code or 0) < 500 else 500
        raise HTTPException(status_code=status_code, detail=str(exc.message))

    stats_rows = await client.select(
        "zhihu_question_stats",
        {
            "question_id": f"eq.{question_id}",
            "select": "question_id,view_count,answer_count,stat_date",
            "order": "stat_date.desc",
            "limit": 2,
        },
    )
    latest_row = stats_rows[0] if stats_rows else stat_payload
    previous_row = stats_rows[1] if len(stats_rows) > 1 else {}

    view_total = int(latest_row.get("view_count") or 0)
    answer_total = int(latest_row.get("answer_count") or 0)
    view_delta = view_total - int(previous_row.get("view_count") or 0) if previous_row else 0
    answer_delta = (
        answer_total - int(previous_row.get("answer_count") or 0) if previous_row else 0
    )

    keyword_map = await fetch_zhihu_keywords_map(client)
    first_keyword_name = keyword_map.get(first_keyword_id) or str(
        keyword_rows[0].get("name") or "未分类"
    )

    return {
        "item": {
            "id": question_id,
            "title": title,
            "url": canonical_url,
            "first_keyword_id": first_keyword_id,
            "first_keyword": first_keyword_name,
            "created_at": existing_row.get("created_at") or now_value,
            "updated_at": now_value,
            "last_seen_at": now_value,
            "view_count_total": view_total,
            "answer_count_total": answer_total,
            "view_count_delta": view_delta,
            "answer_count_delta": answer_delta,
        },
        "is_new": is_new,
    }

@router.get("/api/zhihu/questions")
async def list_zhihu_questions(keyword_id: Optional[str] = None, q: Optional[str] = None, limit: int = 50, offset: int = 0):
    client = ensure_supabase()
    limit = max(1, min(int(limit or 50), 200))
    offset = max(0, int(offset or 0))

    params: Dict[str, Any] = {
        "select": "id,title,url,first_keyword_id,created_at,updated_at,last_seen_at",
        "order": "updated_at.desc",
        "limit": limit,
        "offset": offset,
    }
    count_params: Dict[str, Any] = {}

    safe_q = None
    if q:
        safe_q = q.replace("%", "").replace("*", "").strip()
        if safe_q:
            title_filter = f"ilike.*{safe_q}*"
            params["title"] = title_filter
            count_params["title"] = title_filter

    matched_ids: List[str] = []
    if keyword_id:
        mapping = await client.select(
            "zhihu_question_keywords",
            {"keyword_id": f"eq.{keyword_id}", "select": "question_id"},
        )
        matched_ids = list(dict.fromkeys(str(row.get("question_id")) for row in mapping if row.get("question_id")))
        if not matched_ids:
            return {
                "items": [],
                "total": 0,
                "pagination": {
                    "offset": offset,
                    "limit": limit,
                    "has_more": False,
                    "next_offset": offset,
                    "total": 0,
                },
            }
        id_filter = f"in.({','.join(matched_ids)})"
        params["id"] = id_filter
        count_params["id"] = id_filter

    questions_task = client.select("zhihu_questions", params)
    total_task = fetch_supabase_count(client, "zhihu_questions", count_params)
    questions, total = await asyncio.gather(questions_task, total_task)

    question_ids = [str(row.get("id")) for row in questions if row.get("id")]
    if question_ids:
        stats_limit = min(max(len(question_ids) * 15, len(question_ids) * 2), 3000)
        stats_params = {
            "question_id": f"in.({','.join(question_ids)})",
            "select": "question_id,view_count,answer_count,stat_date",
            "order": "stat_date.desc",
            "limit": stats_limit,
        }
        stats_rows, keyword_map = await asyncio.gather(
            client.select("zhihu_question_stats", stats_params),
            fetch_zhihu_keywords_map(client),
        )
    else:
        stats_rows = []
        keyword_map = {}

    stats_map: Dict[str, List[Dict[str, Any]]] = {}
    for row in stats_rows:
        qid = str(row.get("question_id") or "")
        if not qid:
            continue
        stats_map.setdefault(qid, []).append(row)

    for snapshots in stats_map.values():
        snapshots.sort(key=lambda item: str(item.get("stat_date") or ""), reverse=True)

    items = []
    for row in questions:
        qid = str(row.get("id") or "")
        snapshots = stats_map.get(qid, [])
        latest_row = snapshots[0] if snapshots else {}
        previous_row = snapshots[1] if len(snapshots) > 1 else {}
        view_total = int(latest_row.get("view_count") or 0)
        answer_total = int(latest_row.get("answer_count") or 0)
        view_delta = (
            view_total - int(previous_row.get("view_count") or 0) if previous_row else 0
        )
        answer_delta = (
            answer_total - int(previous_row.get("answer_count") or 0) if previous_row else 0
        )
        items.append(
            {
                **row,
                "first_keyword": keyword_map.get(str(row.get("first_keyword_id")) or "", "未分类"),
                "view_count_total": view_total,
                "answer_count_total": answer_total,
                "view_count_delta": view_delta,
                "answer_count_delta": answer_delta,
            }
        )

    next_offset = offset + len(items)
    has_more = next_offset < total
    return {
        "items": items,
        "total": total,
        "pagination": {
            "offset": offset,
            "limit": limit,
            "has_more": has_more,
            "next_offset": next_offset,
            "total": total,
        },
    }

@router.delete("/api/zhihu/questions/{question_id}")
async def delete_zhihu_question(question_id: str):
    client = ensure_supabase()
    try:
        await client.delete("zhihu_question_stats", {"question_id": f"eq.{question_id}"})
        await client.delete("zhihu_question_keywords", {"question_id": f"eq.{question_id}"})
        await client.delete("zhihu_questions", {"id": f"eq.{question_id}"})
    except SupabaseError as exc:
        raise HTTPException(status_code=500, detail=str(exc.message))
    return {"status": "ok"}

@router.get("/api/zhihu/questions/{question_id}/stats")
async def get_zhihu_question_stats(question_id: str, days: int = 15):
    client = ensure_supabase()
    rows = await client.select("zhihu_question_stats", {"question_id": f"eq.{question_id}", "order": "stat_date.asc", "limit": days})
    return {"stats": rows}

@router.post("/api/zhihu/scrape/run")
async def run_zhihu_scrape(payload: Optional[ZhihuScrapeRunPayload] = None, dry_run: bool = False):
    keyword_id = payload.keyword_id if payload else None
    job_state = create_zhihu_job_state(total=0, keyword_id=keyword_id)
    job_id = job_state["id"]
    if not dry_run:
        asyncio.create_task(
            zhihu_scrape_job(keyword_id=keyword_id, include_existing=True, job_id=job_id)
        )
    return {"status": "queued", "job_id": job_id}

@router.get("/api/zhihu/scrape/status/{job_id}")
async def get_zhihu_scrape_status(job_id: str):
    state = get_zhihu_job_state(job_id)
    if not state:
        raise HTTPException(status_code=404, detail="任务不存在")
    return state

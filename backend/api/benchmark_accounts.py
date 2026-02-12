import asyncio
from typing import Any, Dict, List, Optional, Tuple

import aiohttp
from fastapi import APIRouter, HTTPException

router = APIRouter()

try:
    import core as core
except Exception:
    from backend import core as core

CommentAccountPayload = core.CommentAccountPayload
CommentAccountUpdate = core.CommentAccountUpdate
MyAccountSyncPayload = core.MyAccountSyncPayload
SupabaseError = core.SupabaseError
ensure_supabase = core.ensure_supabase
extract_mid_from_homepage_link = core.extract_mid_from_homepage_link
fetch_account_videos_from_bili = core.fetch_account_videos_from_bili
fetch_account_video_stat = core.fetch_account_video_stat
build_account_video_payload = core.build_account_video_payload
normalize_comment_account = core.normalize_comment_account
normalize_account_video = core.normalize_account_video
utc_now_iso = core.utc_now_iso

BENCHMARK_ACCOUNT_TABLE = "benchmark_accounts"
BENCHMARK_ACCOUNT_VIDEO_TABLE = "benchmark_account_videos"
BENCHMARK_ACCOUNT_PAGE_SIZE = 50


async def sync_benchmark_account_videos_for_account(
    client: core.SupabaseClient,
    account_id: str,
    homepage_link: str,
) -> Tuple[int, int, int]:
    mid = extract_mid_from_homepage_link(homepage_link)
    if not mid:
        raise HTTPException(status_code=400, detail="请先填写正确的账号主页链接")

    videos = await fetch_account_videos_from_bili(mid, page_size=BENCHMARK_ACCOUNT_PAGE_SIZE)
    total_videos = len(videos)

    existing_rows = await client.select(
        BENCHMARK_ACCOUNT_VIDEO_TABLE,
        params={"select": "bvid", "account_id": f"eq.{account_id}"},
    )
    existing_set = {row.get("bvid") for row in existing_rows if row.get("bvid")}

    rows: List[Dict[str, Any]] = []
    added = 0
    updated = 0
    semaphore = asyncio.Semaphore(core.ACCOUNT_VIDEO_STAT_CONCURRENCY)

    async def build_row(item: Dict[str, Any], session: aiohttp.ClientSession):
        bvid = str(item.get("bvid") or item.get("bvid_str") or "").strip()
        if not bvid:
            return None
        async with semaphore:
            stat = await fetch_account_video_stat(bvid, session=session)
        return build_account_video_payload(account_id, item, stat)

    async with aiohttp.ClientSession() as session:
        results = await asyncio.gather(
            *(build_row(item, session) for item in videos),
            return_exceptions=False,
        )

    for payload_row in results:
        if not payload_row:
            continue
        if payload_row["bvid"] in existing_set:
            updated += 1
        else:
            added += 1
        rows.append(payload_row)

    if rows:
        await client.upsert(
            BENCHMARK_ACCOUNT_VIDEO_TABLE,
            rows,
            on_conflict="account_id,bvid",
        )

    return added, updated, total_videos


@router.post("/api/benchmark-accounts/accounts")
async def create_benchmark_account(payload: CommentAccountPayload):
    client = ensure_supabase()
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="账号名称不能为空")

    homepage_link = (payload.homepage_link or "").strip() or None
    body = {
        "name": name,
        "homepage_link": homepage_link,
        "created_at": utc_now_iso(),
    }

    try:
        record = await client.insert(BENCHMARK_ACCOUNT_TABLE, body)
    except SupabaseError as exc:
        status = 400 if exc.status_code in (400, 409) else 500
        raise HTTPException(status_code=status, detail=str(exc.message))

    return {"account": normalize_comment_account(record[0])}


@router.patch("/api/benchmark-accounts/accounts/{account_id}")
async def patch_benchmark_account(account_id: str, payload: CommentAccountUpdate):
    client = ensure_supabase()

    existing = await client.select(BENCHMARK_ACCOUNT_TABLE, {"id": f"eq.{account_id}"})
    if not existing:
        raise HTTPException(status_code=404, detail="账号不存在")

    updates: Dict[str, Any] = {}
    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="账号名称不能为空")
        updates["name"] = name

    if payload.homepage_link is not None:
        updates["homepage_link"] = (payload.homepage_link or "").strip() or None

    if not updates:
        return {"account": normalize_comment_account(existing[0])}

    record = await client.update(BENCHMARK_ACCOUNT_TABLE, updates, {"id": f"eq.{account_id}"})
    return {"account": normalize_comment_account(record[0])}


@router.delete("/api/benchmark-accounts/accounts/{account_id}")
async def delete_benchmark_account(account_id: str):
    client = ensure_supabase()

    existing = await client.select(BENCHMARK_ACCOUNT_TABLE, {"id": f"eq.{account_id}"})
    if not existing:
        raise HTTPException(status_code=404, detail="账号不存在")

    await client.delete(BENCHMARK_ACCOUNT_VIDEO_TABLE, {"account_id": f"eq.{account_id}"})
    await client.delete(BENCHMARK_ACCOUNT_TABLE, {"id": f"eq.{account_id}"})

    return {"status": "ok"}


@router.get("/api/benchmark-accounts/state")
async def get_benchmark_account_state(account_id: Optional[str] = None):
    client = ensure_supabase()
    accounts = await client.select(BENCHMARK_ACCOUNT_TABLE, params={"order": "created_at.asc"})
    videos: List[Dict[str, Any]] = []
    if account_id:
        videos = await client.select(
            BENCHMARK_ACCOUNT_VIDEO_TABLE,
            params={
                "account_id": f"eq.{account_id}",
                "order": "pub_time.desc.nullslast,updated_at.desc",
            },
        )

    return {
        "accounts": [normalize_comment_account(item) for item in accounts],
        "videos": [normalize_account_video(item) for item in videos],
    }


@router.get("/api/benchmark-accounts/video-counts")
async def get_benchmark_account_video_counts():
    client = ensure_supabase()
    accounts = await client.select(BENCHMARK_ACCOUNT_TABLE, params={"order": "created_at.asc"})
    results: List[Dict[str, Any]] = []
    failures: List[Dict[str, Any]] = []

    if not accounts:
        return {"total": 0, "items": [], "failures": []}

    async with aiohttp.ClientSession() as session:
        tasks: List[Tuple[str, str, asyncio.Task]] = []
        for account in accounts:
            account_id = account.get("id") or ""
            name = account.get("name") or ""
            if not account_id:
                failures.append(
                    {
                        "account_id": account_id,
                        "name": name,
                        "reason": "账号ID缺失",
                    }
                )
                continue

            homepage_link = account.get("homepage_link") or ""
            mid = extract_mid_from_homepage_link(homepage_link)
            if not mid:
                failures.append(
                    {
                        "account_id": account_id,
                        "name": name,
                        "reason": "账号主页链接缺失或格式错误",
                    }
                )
                continue

            task = asyncio.create_task(
                fetch_account_videos_from_bili(
                    mid,
                    page_size=BENCHMARK_ACCOUNT_PAGE_SIZE,
                    session=session,
                )
            )
            tasks.append((account_id, name, task))

        for account_id, name, task in tasks:
            try:
                vlist = await task
                result = {
                    "account_id": account_id,
                    "name": name,
                    "count": len(vlist),
                }
            except HTTPException as exc:
                failures.append(
                    {
                        "account_id": account_id,
                        "name": name,
                        "reason": str(exc.detail),
                    }
                )
            except Exception as exc:
                failures.append(
                    {
                        "account_id": account_id,
                        "name": name,
                        "reason": str(exc),
                    }
                )
            else:
                results.append(result)

    total = sum(item.get("count", 0) for item in results)
    return {"total": total, "items": results, "failures": failures}


@router.post("/api/benchmark-accounts/sync")
async def sync_benchmark_account_videos(payload: MyAccountSyncPayload):
    client = ensure_supabase()
    account_id = payload.account_id.strip()
    if not account_id:
        raise HTTPException(status_code=400, detail="账号不能为空")

    existing_accounts = await client.select(BENCHMARK_ACCOUNT_TABLE, {"id": f"eq.{account_id}"})
    if not existing_accounts:
        raise HTTPException(status_code=404, detail="账号不存在")

    account = existing_accounts[0]
    homepage_link = account.get("homepage_link") or ""
    added, updated, video_count = await sync_benchmark_account_videos_for_account(
        client,
        account_id,
        homepage_link,
    )

    videos = await client.select(
        BENCHMARK_ACCOUNT_VIDEO_TABLE,
        params={
            "account_id": f"eq.{account_id}",
            "order": "pub_time.desc.nullslast,updated_at.desc",
        },
    )

    return {
        "added": added,
        "updated": updated,
        "video_count": video_count,
        "videos": [normalize_account_video(item) for item in videos],
    }


@router.post("/api/benchmark-accounts/sync-all")
async def sync_benchmark_account_videos_all():
    client = ensure_supabase()
    accounts = await client.select(BENCHMARK_ACCOUNT_TABLE, params={"order": "created_at.asc"})

    results: List[Dict[str, Any]] = []
    total_added = 0
    total_updated = 0
    total_videos = 0
    failed = 0

    for account in accounts:
        account_id = account.get("id") or ""
        name = account.get("name") or ""
        if not account_id:
            failed += 1
            results.append(
                {
                    "account_id": account_id,
                    "name": name,
                    "added": 0,
                    "updated": 0,
                    "error": "账号ID缺失",
                }
            )
            continue
        try:
            homepage_link = account.get("homepage_link") or ""
            added, updated, video_count = await sync_benchmark_account_videos_for_account(
                client,
                account_id,
                homepage_link,
            )
            total_added += added
            total_updated += updated
            total_videos += video_count
            results.append(
                {
                    "account_id": account_id,
                    "name": name,
                    "added": added,
                    "updated": updated,
                    "video_count": video_count,
                }
            )
        except HTTPException as exc:
            failed += 1
            results.append(
                {
                    "account_id": account_id,
                    "name": name,
                    "added": 0,
                    "updated": 0,
                    "error": str(exc.detail),
                }
            )
        except Exception as exc:
            failed += 1
            results.append(
                {
                    "account_id": account_id,
                    "name": name,
                    "added": 0,
                    "updated": 0,
                    "error": str(exc),
                }
            )

    return {
        "total_accounts": len(accounts),
        "added": total_added,
        "updated": total_updated,
        "failed": failed,
        "video_count": total_videos,
        "results": results,
    }

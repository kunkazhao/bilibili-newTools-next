from fastapi import APIRouter

router = APIRouter()

try:
    import core as core
except Exception:
    from backend import core as core

globals().update({k: v for k, v in core.__dict__.items() if not k.startswith("_")})

@router.get("/api/comment/blue-links/state-v2")

async def get_comment_blue_link_state():

    return await fetch_comment_snapshot()

@router.post("/api/comment/accounts")

async def create_comment_account(payload: CommentAccountPayload):

    client = ensure_supabase()

    name = payload.name.strip()

    if not name:

        raise HTTPException(status_code=400, detail="账号名称不能为空")

    homepage_link = (payload.homepage_link or "").strip() or None
    body = {"name": name, "created_at": utc_now_iso(), "homepage_link": homepage_link}

    try:

        record = await client.insert("comment_accounts", body)

    except SupabaseError as exc:

        status = 400 if exc.status_code in (400, 409) else 500

        raise HTTPException(status_code=status, detail=str(exc.message))

    return {"account": normalize_comment_account(record[0])}

@router.patch("/api/comment/accounts/{account_id}")

async def patch_comment_account(account_id: str, payload: CommentAccountUpdate):

    client = ensure_supabase()

    existing = await client.select("comment_accounts", {"id": f"eq.{account_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="Account not found")

    updates: Dict[str, Any] = {}

    if payload.name is not None:

        name = payload.name.strip()

        if not name:

            raise HTTPException(status_code=400, detail="Account name is required")

        updates["name"] = name

    if payload.homepage_link is not None:
        updates["homepage_link"] = (payload.homepage_link or "").strip() or None

    if not updates:

        return {"account": normalize_comment_account(existing[0])}

    record = await client.update("comment_accounts", updates, {"id": f"eq.{account_id}"})

    return {"account": normalize_comment_account(record[0])}

@router.delete("/api/comment/accounts/{account_id}")

async def delete_comment_account(account_id: str):

    client = ensure_supabase()

    existing = await client.select("comment_accounts", {"id": f"eq.{account_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="账号不存在")

    await client.delete("comment_combos", {"account_id": f"eq.{account_id}"})


    await client.delete("comment_accounts", {"id": f"eq.{account_id}"})

    return {"status": "ok"}

@router.get("/api/my-accounts/state")
async def get_my_account_state(account_id: Optional[str] = None):
    client = ensure_supabase()
    accounts = await client.select("comment_accounts", params={"order": "created_at.asc"})
    videos: List[Dict[str, Any]] = []
    if account_id:
        videos = await client.select(
            "account_videos",
            params={
                "account_id": f"eq.{account_id}",
                "order": "pub_time.desc.nullslast,updated_at.desc",
            },
        )
    return {
        "accounts": [normalize_comment_account(item) for item in accounts],
        "videos": [normalize_account_video(item) for item in videos],
    }

@router.get("/api/my-accounts/video-counts")
async def get_my_account_video_counts():
    client = ensure_supabase()
    accounts = await client.select("comment_accounts", params={"order": "created_at.asc"})
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
                        "reason": "请先填写正确的账号主页链接",
                    }
                )
                continue

            async def fetch_count(target_mid: str, acc_id: str, acc_name: str) -> Dict[str, Any]:
                vlist = await fetch_account_videos_from_bili(target_mid, session=session)
                return {"account_id": acc_id, "name": acc_name, "count": len(vlist)}

            tasks.append(
                (
                    account_id,
                    name,
                    asyncio.create_task(fetch_count(mid, account_id, name)),
                )
            )

        for account_id, name, task in tasks:
            try:
                result = await task
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

@router.post("/api/my-accounts/sync")
async def sync_my_account_videos(payload: MyAccountSyncPayload):
    client = ensure_supabase()
    account_id = payload.account_id.strip()
    if not account_id:
        raise HTTPException(status_code=400, detail="账号不能为空")

    existing_accounts = await client.select("comment_accounts", {"id": f"eq.{account_id}"})
    if not existing_accounts:
        raise HTTPException(status_code=404, detail="账号不存在")

    account = existing_accounts[0]
    homepage_link = account.get("homepage_link") or ""
    added, updated, video_count = await sync_account_videos_for_account(
        client, account_id, homepage_link
    )

    videos = await client.select(
        "account_videos",
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

@router.post("/api/my-accounts/sync-all")
async def sync_my_account_videos_all():
    client = ensure_supabase()
    accounts = await client.select("comment_accounts", params={"order": "created_at.asc"})
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
            added, updated, video_count = await sync_account_videos_for_account(
                client, account_id, homepage_link
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

@router.post("/api/comment/combos")

async def create_comment_combo(payload: CommentComboCreate):

    client = ensure_supabase()

    if not payload.name.strip() or not payload.content.strip():

        raise HTTPException(status_code=400, detail="名称与内容不能为空")

    body = {

        "account_id": payload.account_id,

        "name": payload.name.strip(),

        "content": payload.content.strip(),

        "remark": payload.remark or None,

        "source_link": payload.source_link or None,

        "source_type": payload.source_type or ("link" if payload.source_link else "manual"),

        "created_at": utc_now_iso(),

        "updated_at": utc_now_iso(),

    }

    try:

        record = await client.insert("comment_combos", body)

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    return {"combo": normalize_comment_combo(record[0])}

@router.patch("/api/comment/combos/{combo_id}")

async def patch_comment_combo(combo_id: str, payload: CommentComboUpdate):

    client = ensure_supabase()

    updates: Dict[str, Any] = {}

    if payload.name is not None:

        if not payload.name.strip():

            raise HTTPException(status_code=400, detail="名称不能为空")

        updates["name"] = payload.name.strip()

    if payload.content is not None:

        if not payload.content.strip():

            raise HTTPException(status_code=400, detail="内容不能为空")

        updates["content"] = payload.content.strip()

    if payload.remark is not None:

        updates["remark"] = payload.remark or None

    if payload.source_link is not None:

        updates["source_link"] = payload.source_link or None

    if payload.source_type is not None:

        updates["source_type"] = payload.source_type



    if not updates:

        raise HTTPException(status_code=400, detail="没有需要更新的内容")

    updates["updated_at"] = utc_now_iso()

    try:

        record = await client.update("comment_combos", updates, {"id": f"eq.{combo_id}"})

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    if not record:

        raise HTTPException(status_code=404, detail="蓝链组合不存在")

    return {"combo": normalize_comment_combo(record[0])}

@router.delete("/api/comment/combos/{combo_id}")

async def delete_comment_combo(combo_id: str):

    client = ensure_supabase()

    existing = await client.select("comment_combos", {"id": f"eq.{combo_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="蓝链组合不存在")

    await client.delete("comment_combos", {"id": f"eq.{combo_id}"})

    return {"status": "ok"}

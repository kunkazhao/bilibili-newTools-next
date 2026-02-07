from fastapi import APIRouter

router = APIRouter()

try:
    import main as core
except Exception:
    from backend import main as core

globals().update({k: v for k, v in core.__dict__.items() if not k.startswith("_")})

@router.get("/api/benchmark/state")

async def get_benchmark_state(mode: str = Query("full")):

    return await fetch_benchmark_snapshot(mode)

@router.post("/api/benchmark/categories")

async def create_benchmark_category(payload: BenchmarkCategoryPayload):

    client = ensure_supabase()

    name = payload.name.strip()

    if not name:

        raise HTTPException(status_code=400, detail="分类名称不能为空")

    body = {"name": name, "color": payload.color, "created_at": utc_now_iso()}

    try:

        record = await client.insert("benchmark_categories", body)

    except SupabaseError as exc:

        status = 400 if exc.status_code in (400, 409) else 500

        raise HTTPException(status_code=status, detail=str(exc.message))

    data = {"id": record[0].get("id"), "name": record[0].get("name"), "color": record[0].get("color"), "created_at": record[0].get("created_at")}

    return {"category": data}

@router.delete("/api/benchmark/categories/{category_id}")

async def delete_benchmark_category(category_id: str):

    client = ensure_supabase()

    existing = await client.select("benchmark_categories", {"id": f"eq.{category_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="分类不存在")

    await client.delete("benchmark_entries", {"category_id": f"eq.{category_id}"})

    await client.delete("benchmark_categories", {"id": f"eq.{category_id}"})

    return {"status": "ok"}

@router.post("/api/benchmark/entries")

async def create_benchmark_entry(payload: BenchmarkEntryPayload):

    client = ensure_supabase()

    title = payload.title.strip()

    if not title:

        raise HTTPException(status_code=400, detail="标题不能为空")

    body = {

        "category_id": payload.category_id,

        "title": title,

        "link": payload.link or None,

        "bvid": payload.bvid or None,

        "cover": payload.cover or None,

        "author": payload.author or None,

        "duration": payload.duration,

        "pub_time": _normalize_pub_time(payload.pub_time),

        "note": payload.note or None,

        "owner": payload.owner or {},

        "stats": payload.stats or {},

        "payload": payload.payload or {},

        "page": payload.page or 1,

        "created_at": utc_now_iso(),

        "updated_at": utc_now_iso(),

    }

    try:

        record = await client.insert("benchmark_entries", body)

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    return {"entry": normalize_benchmark_entry(record[0])}

@router.patch("/api/benchmark/entries/{entry_id}")

async def patch_benchmark_entry(entry_id: str, payload: BenchmarkEntryUpdate):

    client = ensure_supabase()

    updates: Dict[str, Any] = {}

    if payload.title is not None:

        if not payload.title.strip():

            raise HTTPException(status_code=400, detail="标题不能为空")

        updates["title"] = payload.title.strip()

    if payload.link is not None:

        updates["link"] = payload.link or None

    if payload.bvid is not None:

        updates["bvid"] = payload.bvid or None

    if payload.cover is not None:

        updates["cover"] = payload.cover or None

    if payload.author is not None:

        updates["author"] = payload.author or None

    if payload.duration is not None:

        updates["duration"] = payload.duration

    if payload.pub_time is not None:

        updates["pub_time"] = _normalize_pub_time(payload.pub_time)

    if payload.note is not None:

        updates["note"] = payload.note or None

    if payload.owner is not None:

        updates["owner"] = payload.owner

    if payload.stats is not None:

        updates["stats"] = payload.stats

    if payload.payload is not None:

        updates["payload"] = payload.payload

    if payload.page is not None:

        updates["page"] = payload.page

    if payload.source_type is not None:

        updates["source_type"] = payload.source_type

    if payload.category_id is not None:

        updates["category_id"] = payload.category_id

    if not updates:

        raise HTTPException(status_code=400, detail="没有需要更新的内容")

    updates["updated_at"] = utc_now_iso()

    try:

        record = await client.update("benchmark_entries", updates, {"id": f"eq.{entry_id}"})

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    if not record:

        raise HTTPException(status_code=404, detail="对标记录不存在")

    return {"entry": normalize_benchmark_entry(record[0])}

@router.delete("/api/benchmark/entries/{entry_id}")

async def delete_benchmark_entry(entry_id: str):

    client = ensure_supabase()

    existing = await client.select("benchmark_entries", {"id": f"eq.{entry_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="对标记录不存在")

    await client.delete("benchmark_entries", {"id": f"eq.{entry_id}"})

    return {"status": "ok"}

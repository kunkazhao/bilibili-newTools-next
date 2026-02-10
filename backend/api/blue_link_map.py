from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, HTTPException

router = APIRouter()

try:
    import core as core
except Exception:
    from backend import core as core

BlueLinkMapBatchPayload = core.BlueLinkMapBatchPayload
BlueLinkMapCategoryCreate = core.BlueLinkMapCategoryCreate
BlueLinkMapCategoryUpdate = core.BlueLinkMapCategoryUpdate
BlueLinkMapClearPayload = core.BlueLinkMapClearPayload
BlueLinkMapEntryUpdate = core.BlueLinkMapEntryUpdate
CACHE_NS_BLUE_LINK_MAP = core.CACHE_NS_BLUE_LINK_MAP
SupabaseError = core.SupabaseError
cache = core.cache
detect_blue_link_platform = core.detect_blue_link_platform
fetch_blue_link_map_snapshot = core.fetch_blue_link_map_snapshot
is_valid_blue_link_source_link = core.is_valid_blue_link_source_link
normalize_blue_link_map_category = core.normalize_blue_link_map_category
normalize_blue_link_map_entry = core.normalize_blue_link_map_entry
normalize_blue_link_source_link = core.normalize_blue_link_source_link



def _core_attr(name):
    return getattr(core, name)


def ensure_supabase(*args, **kwargs):
    return _core_attr("ensure_supabase")(*args, **kwargs)


def utc_now_iso(*args, **kwargs):
    return _core_attr("utc_now_iso")(*args, **kwargs)

@router.get("/api/blue-link-map/state-v2")

async def get_blue_link_map_state(product_ids: Optional[str] = None):

    ids = [pid.strip() for pid in (product_ids or "").split(",") if pid and pid.strip()]
    return await fetch_blue_link_map_snapshot(ids if ids else None)

@router.post("/api/blue-link-map/categories")

async def create_blue_link_map_category(payload: BlueLinkMapCategoryCreate):

    client = ensure_supabase()

    name = payload.name.strip()

    if not name:

        raise HTTPException(status_code=400, detail="分类名称不能为空")

    body = {

        "account_id": payload.account_id,

        "name": name,

        "color": payload.color,

        "created_at": utc_now_iso(),

        "updated_at": utc_now_iso(),

    }

    try:

        record = await client.insert("blue_link_map_categories", body)

    except SupabaseError as exc:

        status = 400 if exc.status_code in (400, 409) else 500

        raise HTTPException(status_code=status, detail=str(exc.message))

    return {"category": normalize_blue_link_map_category(record[0])}

@router.patch("/api/blue-link-map/categories/{category_id}")

async def patch_blue_link_map_category(category_id: str, payload: BlueLinkMapCategoryUpdate):

    client = ensure_supabase()

    updates: Dict[str, Any] = {}

    if payload.name is not None:

        name = payload.name.strip()

        if not name:

            raise HTTPException(status_code=400, detail="分类名称不能为空")

        updates["name"] = name

    if payload.color is not None:

        updates["color"] = payload.color

    if not updates:

        raise HTTPException(status_code=400, detail="没有需要更新的内容")

    updates["updated_at"] = utc_now_iso()

    try:

        record = await client.update("blue_link_map_categories", updates, {"id": f"eq.{category_id}"})

    except SupabaseError as exc:

        status = 400 if exc.status_code in (400, 409) else 500

        raise HTTPException(status_code=status, detail=str(exc.message))

    if not record:

        raise HTTPException(status_code=404, detail="分类不存在")

    return {"category": normalize_blue_link_map_category(record[0])}

@router.delete("/api/blue-link-map/categories/{category_id}")

async def delete_blue_link_map_category(category_id: str):

    client = ensure_supabase()

    existing = await client.select("blue_link_map_categories", {"id": f"eq.{category_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="分类不存在")

    await client.delete("blue_link_map_entries", {"category_id": f"eq.{category_id}"})

    await client.delete("blue_link_map_categories", {"id": f"eq.{category_id}"})

    return {"status": "ok"}

@router.post("/api/blue-link-map/entries/batch")

async def batch_upsert_blue_link_map_entries(payload: BlueLinkMapBatchPayload):

    client = ensure_supabase()

    if not payload.entries:

        raise HTTPException(status_code=400, detail="没有可导入的蓝链")

    now = utc_now_iso()

    matched: Dict[Tuple[str, str, str], Dict[str, Any]] = {}

    unmatched: List[Dict[str, Any]] = []

    for index, entry in enumerate(payload.entries):

        source_link = normalize_blue_link_source_link(entry.source_link)

        if not source_link:

            raise HTTPException(status_code=400, detail=f"Entry {index + 1} source link is empty or invalid")

        if not is_valid_blue_link_source_link(source_link):

            raise HTTPException(status_code=400, detail=f"Entry {index + 1} source link format is invalid")

        record = {

            "account_id": entry.account_id,

            "category_id": entry.category_id,

            "product_id": entry.product_id,

            "sku_id": entry.sku_id,

            "source_link": source_link,
            "platform": detect_blue_link_platform(source_link),
            "remark": (entry.remark or "").strip() or None,

            "updated_at": now,

        }

        if entry.product_id:

            matched[(entry.account_id, entry.product_id, record["platform"])] = record

        else:

            unmatched.append({**record, "created_at": now})

    results: List[Dict[str, Any]] = []

    if matched:

        try:

            upserted = await client.upsert(

                "blue_link_map_entries",

                list(matched.values()),

                on_conflict="account_id,product_id,platform"

            )

            results.extend(upserted)

        except SupabaseError as exc:

            raise HTTPException(status_code=500, detail=str(exc.message))

    if unmatched:

        try:

            inserted = await client.insert("blue_link_map_entries", unmatched)

            results.extend(inserted)

        except SupabaseError as exc:

            raise HTTPException(status_code=500, detail=str(exc.message))

    cache.invalidate(CACHE_NS_BLUE_LINK_MAP)

    return {"entries": [normalize_blue_link_map_entry(item) for item in results]}

@router.post("/api/blue-link-map/entries/clear")
async def clear_blue_link_map_entries(payload: BlueLinkMapClearPayload):
    client = ensure_supabase()
    account_id = (payload.account_id or "").strip()
    category_id = (payload.category_id or "").strip()
    if not account_id or not category_id:
        raise HTTPException(status_code=400, detail="账号或分类不能为空")
    await client.delete(
        "blue_link_map_entries",
        {"account_id": f"eq.{account_id}", "category_id": f"eq.{category_id}"},
    )
    cache.invalidate(CACHE_NS_BLUE_LINK_MAP)

    return {"status": "ok"}

@router.patch("/api/blue-link-map/entries/{entry_id}")

async def patch_blue_link_map_entry(entry_id: str, payload: BlueLinkMapEntryUpdate):

    client = ensure_supabase()

    existing_rows = await client.select("blue_link_map_entries", {"id": f"eq.{entry_id}"})

    if not existing_rows:

        raise HTTPException(status_code=404, detail="映射不存在")

    existing = existing_rows[0]

    updates: Dict[str, Any] = {}

    if payload.category_id is not None:

        updates["category_id"] = payload.category_id

    if payload.source_link is not None:

        normalized_source_link = normalize_blue_link_source_link(payload.source_link)

        if not normalized_source_link:

            raise HTTPException(status_code=400, detail="Source link cannot be empty")

        if not is_valid_blue_link_source_link(normalized_source_link):

            raise HTTPException(status_code=400, detail="Source link format is invalid")

        updates["source_link"] = normalized_source_link

        updates["platform"] = detect_blue_link_platform(normalized_source_link)

    if payload.product_id is not None:

        updates["product_id"] = payload.product_id

    if payload.sku_id is not None:

        updates["sku_id"] = payload.sku_id
    if payload.remark is not None:
        updates["remark"] = (payload.remark or "").strip() or None

    if not updates:

        raise HTTPException(status_code=400, detail="没有需要更新的内容")

    updates["updated_at"] = utc_now_iso()



    if payload.product_id:

        payload_record = {

            "account_id": existing.get("account_id"),

            "category_id": updates.get("category_id", existing.get("category_id")),

            "product_id": payload.product_id,

            "sku_id": updates.get("sku_id", existing.get("sku_id")),

            "source_link": updates.get("source_link", existing.get("source_link")),
            "platform": updates.get("platform")
            or existing.get("platform")
            or detect_blue_link_platform(updates.get("source_link", existing.get("source_link"))),
            "remark": updates.get("remark", existing.get("remark")),

            "updated_at": updates["updated_at"],

        }

        try:

            merged = await client.upsert(

                "blue_link_map_entries",

                payload_record,

                on_conflict="account_id,product_id,platform"

            )

        except SupabaseError as exc:

            raise HTTPException(status_code=500, detail=str(exc.message))

        if not merged:

            raise HTTPException(status_code=500, detail="更新失败")

        merged_entry = merged[0]

        if merged_entry.get("id") != entry_id:

            await client.delete("blue_link_map_entries", {"id": f"eq.{entry_id}"})

        cache.invalidate(CACHE_NS_BLUE_LINK_MAP)

        return {"entry": normalize_blue_link_map_entry(merged_entry)}



    try:

        record = await client.update("blue_link_map_entries", updates, {"id": f"eq.{entry_id}"})

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    if not record:

        raise HTTPException(status_code=404, detail="映射不存在")

    cache.invalidate(CACHE_NS_BLUE_LINK_MAP)

    return {"entry": normalize_blue_link_map_entry(record[0])}

@router.delete("/api/blue-link-map/entries/{entry_id}")

async def delete_blue_link_map_entry(entry_id: str):

    client = ensure_supabase()

    existing = await client.select("blue_link_map_entries", {"id": f"eq.{entry_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="映射不存在")

    await client.delete("blue_link_map_entries", {"id": f"eq.{entry_id}"})

    cache.invalidate(CACHE_NS_BLUE_LINK_MAP)

    return {"status": "ok"}

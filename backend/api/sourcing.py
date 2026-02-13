import asyncio
import time
import uuid
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile

router = APIRouter()

try:
    import core as core
except Exception:
    from backend import core as core

AiBatchStartRequest = core.AiBatchStartRequest
AiConfirmRequest = core.AiConfirmRequest
AiFillRequest = core.AiFillRequest
SCHEME_SYNC_FIELDS = core.SCHEME_SYNC_FIELDS
SUPABASE_SERVICE_ROLE_KEY = core.SUPABASE_SERVICE_ROLE_KEY
SUPABASE_URL = core.SUPABASE_URL
SourcingCategoryCreate = core.SourcingCategoryCreate
SourcingCategoryUpdate = core.SourcingCategoryUpdate
SourcingItemBatchCreate = core.SourcingItemBatchCreate
SourcingItemCreate = core.SourcingItemCreate
SourcingItemUpdate = core.SourcingItemUpdate
SourcingItemsByIdsRequest = core.SourcingItemsByIdsRequest
SupabaseError = core.SupabaseError
_sanitize_tags = core._sanitize_tags
ai_fill_product_params = core.ai_fill_product_params
decimal_str = core.decimal_str
delete_old_cover = core.delete_old_cover
derive_uid_prefix = core.derive_uid_prefix
ensure_supabase = core.ensure_supabase
fetch_sourcing_categories = core.fetch_sourcing_categories
fetch_sourcing_category_counts = core.fetch_sourcing_category_counts
fetch_sourcing_items_page = core.fetch_sourcing_items_page
merge_spec_payload = core.merge_spec_payload
normalize_sourcing_category = core.normalize_sourcing_category
normalize_sourcing_item = core.normalize_sourcing_item
normalize_spec_fields = core.normalize_spec_fields
normalize_spec_payload = core.normalize_spec_payload
resolve_sourcing_ai_batch_items = core.resolve_sourcing_ai_batch_items
run_sourcing_ai_batch_job = core.run_sourcing_ai_batch_job
sync_scheme_item_cover = core.sync_scheme_item_cover
sync_scheme_item_fields = core.sync_scheme_item_fields
utc_now_iso = core.utc_now_iso


def _update_sourcing_ai_job_state(job_id: str, **updates: Any) -> None:
    with core.sourcing_ai_job_lock:
        state = core.sourcing_ai_job_store.get(job_id)
        if not state:
            return
        state.update(updates)
        state["updated_at"] = utc_now_iso()
        core.sourcing_ai_job_store[job_id] = dict(state)


if not hasattr(core, "update_sourcing_ai_job_state"):
    core.update_sourcing_ai_job_state = _update_sourcing_ai_job_state


def create_sourcing_ai_job_state(total: int) -> Dict[str, Any]:
    helper = getattr(core, "create_sourcing_ai_job_state", None)
    if callable(helper):
        return helper(total)

    now = utc_now_iso()
    state = {
        "id": uuid.uuid4().hex,
        "status": "queued",
        "total": total,
        "processed": 0,
        "success": 0,
        "failed": 0,
        "failures": [],
        "error": None,
        "created_at": now,
        "updated_at": now,
    }
    with core.sourcing_ai_job_lock:
        core.sourcing_ai_job_store[state["id"]] = dict(state)
    return dict(state)


def get_sourcing_ai_job_state(job_id: str) -> Optional[Dict[str, Any]]:
    helper = getattr(core, "get_sourcing_ai_job_state", None)
    if callable(helper):
        return helper(job_id)

    with core.sourcing_ai_job_lock:
        state = core.sourcing_ai_job_store.get(job_id)
        return dict(state) if state else None


@router.get("/api/sourcing/overview")

async def get_sourcing_overview(

    category_id: Optional[str] = None,

    limit: int = 50,

    offset: int = 0,

    q: Optional[str] = None,

    fields: str = "list",

    sort: Optional[str] = None,

    include_counts: bool = True,

):

    categories = await fetch_sourcing_categories(include_counts=include_counts)

    items_page = await fetch_sourcing_items_page(

        category_id=category_id,

        limit=limit,

        offset=offset,

        keyword=q,

        fields=fields,
        sort=sort,

    )

    return {

        "categories": categories,

        "items": items_page["items"],

        "pagination": {

            "offset": items_page["offset"],

            "limit": items_page["limit"],

            "has_more": items_page["has_more"],

            "next_offset": items_page["next_offset"],

        }

    }

@router.get("/api/sourcing/categories")

async def list_sourcing_categories(include_counts: bool = True):

    categories = await fetch_sourcing_categories(include_counts=include_counts)

    return {"categories": categories}

@router.get("/api/sourcing/categories/counts")

async def list_sourcing_category_counts(force: bool = False):

    return await fetch_sourcing_category_counts(force=force)

@router.get("/api/sourcing/items")

async def list_sourcing_items(

    category_id: Optional[str] = None,

    limit: int = 50,

    offset: int = 0,

    q: Optional[str] = None,

    fields: str = "list",
    sort: Optional[str] = None,

):

    items_page = await fetch_sourcing_items_page(

        category_id=category_id,

        limit=limit,

        offset=offset,

        keyword=q,

        fields=fields,
        sort=sort,

    )

    return items_page

@router.get("/api/sourcing/items/{item_id}")

async def get_sourcing_item(item_id: str):

    client = ensure_supabase()

    rows = await client.select("sourcing_items", {"id": f"eq.{item_id}"})

    if not rows:

        raise HTTPException(status_code=404, detail="选品不存在")

    return {"item": normalize_sourcing_item(rows[0])}

@router.post("/api/sourcing/items/by-ids")

async def get_sourcing_items_by_ids(payload: SourcingItemsByIdsRequest):

    ids = [item_id for item_id in (payload.ids or []) if item_id]

    if not ids:

        return {"items": []}

    seen = set()

    ordered_ids = []

    for item_id in ids:

        if item_id in seen:

            continue

        seen.add(item_id)

        ordered_ids.append(item_id)

    quoted = ",".join([f'"{item_id}"' for item_id in ordered_ids])

    client = ensure_supabase()

    try:

        rows = await client.select("sourcing_items", params={"id": f"in.({quoted})"})

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    items = [normalize_sourcing_item(row) for row in rows]

    item_map = {item.get("id"): item for item in items if item.get("id")}

    ordered_items = [item_map[item_id] for item_id in ordered_ids if item_id in item_map]

    return {"items": ordered_items}

@router.post("/api/sourcing/categories")

async def create_sourcing_category(payload: SourcingCategoryCreate):

    client = ensure_supabase()

    name = payload.name.strip()

    if not name:

        raise HTTPException(status_code=400, detail="分类名称不能为空")

    spec_fields = normalize_spec_fields(payload.spec_fields or [])

    sort_order = payload.sort_order
    if sort_order is None:
        try:
            rows = await client.select(
                "sourcing_categories",
                params={
                    "select": "sort_order,created_at",
                    "order": "sort_order.desc.nullslast,created_at.desc",
                    "limit": 1
                }
            )
            if rows:
                last_order = rows[0].get("sort_order")
                if last_order is not None:
                    try:
                        sort_order = int(last_order) + 10
                    except (TypeError, ValueError):
                        sort_order = 10
                else:
                    sort_order = 10
            else:
                sort_order = 10
        except SupabaseError as exc:
            if "sort_order" in str(exc.message):
                sort_order = None
            else:
                raise

    body = {

        "name": name,

        "color": payload.color,

        "spec_fields": spec_fields,
        "sort_order": sort_order,
        "parent_id": payload.parent_id,

        "uid_prefix": derive_uid_prefix(name),

        "uid_counter": 0,

        "created_at": utc_now_iso(),

        "updated_at": utc_now_iso(),

    }

    try:

        record = await client.insert("sourcing_categories", body)

    except SupabaseError as exc:

        status = 400 if exc.status_code in (400, 409) else 500

        raise HTTPException(status_code=status, detail=str(exc.message))

    category = normalize_sourcing_category(record[0])

    return {"category": category}

@router.patch("/api/sourcing/categories/{category_id}")

async def patch_sourcing_category(category_id: str, payload: SourcingCategoryUpdate):

    client = ensure_supabase()

    updates: Dict[str, Any] = {}

    if payload.name is not None:

        name = payload.name.strip()

        if not name:

            raise HTTPException(status_code=400, detail="分类名称不能为空")

        updates["name"] = name

        updates["uid_prefix"] = derive_uid_prefix(name)

    if payload.color is not None:

        updates["color"] = payload.color



    if payload.spec_fields is not None:
        updates["spec_fields"] = normalize_spec_fields(payload.spec_fields or [])

    if payload.sort_order is not None:
        updates["sort_order"] = payload.sort_order

    if "parent_id" in getattr(payload, "__fields_set__", set()):
        updates["parent_id"] = payload.parent_id

    if not updates:

        raise HTTPException(status_code=400, detail="没有需要更新的内容")

    updates["updated_at"] = utc_now_iso()

    try:

        record = await client.update("sourcing_categories", updates, {"id": f"eq.{category_id}"})

    except SupabaseError as exc:

        status = 400 if exc.status_code in (400, 409) else 500

        raise HTTPException(status_code=status, detail=str(exc.message))

    if not record:

        raise HTTPException(status_code=404, detail="分类不存在")

    return {"category": normalize_sourcing_category(record[0])}

@router.delete("/api/sourcing/categories/{category_id}")

async def delete_sourcing_category(category_id: str):

    client = ensure_supabase()

    existing = await client.select("sourcing_categories", {"id": f"eq.{category_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="分类不存在")

    await client.delete("sourcing_items", {"category_id": f"eq.{category_id}"})

    # Benchmark videos now share sourcing categories; deleting category should also clear linked benchmark entries.
    await client.delete("benchmark_entries", {"category_id": f"eq.{category_id}"})

    await client.delete("sourcing_categories", {"id": f"eq.{category_id}"})

    return {"status": "ok"}

@router.post("/api/sourcing/items")

async def create_sourcing_item(payload: SourcingItemCreate, request: Request):

    client = ensure_supabase()

    category = await client.select("sourcing_categories", {"id": f"eq.{payload.category_id}"})

    if not category:

        raise HTTPException(status_code=404, detail="分类不存在")

    cat = category[0]

    prefix = cat.get("uid_prefix") or derive_uid_prefix(cat.get("name"))

    counter = (cat.get("uid_counter") or 0) + 1

    await client.update("sourcing_categories", {"uid_counter": counter, "uid_prefix": prefix, "updated_at": utc_now_iso()}, {"id": f"eq.{payload.category_id}"})

    uid = f"{prefix}{str(counter).zfill(3)}"

    title = payload.title.strip()

    if not title:

        raise HTTPException(status_code=400, detail="选品标题不能为空")

    raw_spec = None
    try:
        raw_payload = await request.json()
        if isinstance(raw_payload, dict):
            raw_spec = raw_payload.get("spec")
    except Exception:
        raw_spec = None

    merged_spec = merge_spec_payload(payload.spec, raw_spec)

    jd_price = payload.jd_price if payload.jd_price is not None else payload.price
    jd_commission = (
        payload.jd_commission if payload.jd_commission is not None else payload.commission
    )
    jd_commission_rate = (
        payload.jd_commission_rate
        if payload.jd_commission_rate is not None
        else payload.commission_rate
    )

    body = {

        "category_id": payload.category_id,

        "uid": uid,

        "title": title,

        "link": payload.link or None,

        "taobao_link": payload.taobao_link or None,

        "price": decimal_str(jd_price),

        "commission": decimal_str(jd_commission),

        "commission_rate": decimal_str(jd_commission_rate),

        "jd_price": decimal_str(jd_price),

        "jd_commission": decimal_str(jd_commission),

        "jd_commission_rate": decimal_str(jd_commission_rate),

        "jd_sales": decimal_str(payload.jd_sales),

        "tb_price": decimal_str(payload.tb_price),

        "tb_commission": decimal_str(payload.tb_commission),

        "tb_commission_rate": decimal_str(payload.tb_commission_rate),

        "tb_sales": decimal_str(payload.tb_sales),

        "source_type": payload.source_type or "manual",

        "source_ref": payload.source_ref or None,

        "cover_url": payload.cover_url or None,

        "remark": payload.remark or None,

        "spec": normalize_spec_payload(merged_spec or {}),

        "tags": _sanitize_tags(payload.tags),

        "created_at": utc_now_iso(),

        "updated_at": utc_now_iso(),

    }

    try:

        record = await client.insert("sourcing_items", body)

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    return {

        "item": normalize_sourcing_item(record[0]),

        "category": normalize_sourcing_category({**cat, "uid_counter": counter})

    }

@router.post("/api/sourcing/items/batch")

async def create_sourcing_items_batch(payload: SourcingItemBatchCreate, request: Request):

    client = ensure_supabase()

    if not payload.items:

        raise HTTPException(status_code=400, detail="没有可归档的商品")

    category = await client.select("sourcing_categories", {"id": f"eq.{payload.category_id}"})

    if not category:

        raise HTTPException(status_code=404, detail="分类不存在")

    cat = category[0]

    prefix = cat.get("uid_prefix") or derive_uid_prefix(cat.get("name"))

    counter = cat.get("uid_counter") or 0

    now = utc_now_iso()



    raw_items = None
    try:
        raw_payload = await request.json()
        if isinstance(raw_payload, dict):
            raw_items = raw_payload.get("items")
    except Exception:
        raw_items = None

    incoming = []

    temp_ids = []

    for index, item in enumerate(payload.items):

        raw_spec = None
        if isinstance(raw_items, list) and index < len(raw_items) and isinstance(raw_items[index], dict):
            raw_spec = raw_items[index].get("spec")

        merged_spec = merge_spec_payload(item.spec, raw_spec)
        spec = normalize_spec_payload(merged_spec or {})

        temp_id = spec.get("_temp_id") if isinstance(spec, dict) else None

        incoming.append((item, spec, temp_id))

        if temp_id:

            temp_ids.append(temp_id)



    existing_map: Dict[str, Dict[str, Any]] = {}

    if temp_ids:

        try:

            existing_rows = await client.select(

                "sourcing_items",

                params={"select": "id,category_id,uid,title,link,taobao_link,price,commission,commission_rate,jd_price,jd_commission,jd_commission_rate,jd_sales,tb_price,tb_commission,tb_commission_rate,tb_sales,source_type,source_ref,cover_url,remark,spec,tags"}

            )

        except SupabaseError as exc:

            raise HTTPException(status_code=500, detail=str(exc.message))

        for row in existing_rows or []:

            spec = row.get("spec") or {}

            if not isinstance(spec, dict):

                continue

            temp_id = spec.get("_temp_id")

            if temp_id:

                existing_map[temp_id] = row



    rows = []

    updated_items = []

    skipped_count = 0

    seen_temp_ids = set()



    for item, spec, temp_id in incoming:

        title = item.title.strip()

        if not title:

            raise HTTPException(status_code=400, detail="选品标题不能为空")



        if temp_id:

            if temp_id in seen_temp_ids:

                skipped_count += 1

                continue

            seen_temp_ids.add(temp_id)



        if temp_id and temp_id in existing_map:

            existing = existing_map[temp_id]

            existing_spec = existing.get("spec") or {}

            existing_hash = existing_spec.get("_content_hash") if isinstance(existing_spec, dict) else None

            incoming_hash = spec.get("_content_hash") if isinstance(spec, dict) else None

            if incoming_hash and existing_hash and incoming_hash == existing_hash:

                skipped_count += 1

                continue

            if isinstance(spec, dict):

                if existing_spec.get("_source_link") and not spec.get("_source_link"):

                    spec["_source_link"] = existing_spec.get("_source_link")

                if existing_spec.get("_temp_id"):

                    spec["_temp_id"] = existing_spec.get("_temp_id")

            jd_price = item.jd_price if item.jd_price is not None else item.price
            jd_commission = (
                item.jd_commission if item.jd_commission is not None else item.commission
            )
            jd_commission_rate = (
                item.jd_commission_rate
                if item.jd_commission_rate is not None
                else item.commission_rate
            )

            updates = {

                "title": title,

                "link": item.link or None,

                "taobao_link": item.taobao_link or None,

                "price": decimal_str(jd_price),

                "commission": decimal_str(jd_commission),

                "commission_rate": decimal_str(jd_commission_rate),

                "jd_price": decimal_str(jd_price),

                "jd_commission": decimal_str(jd_commission),

                "jd_commission_rate": decimal_str(jd_commission_rate),

                "jd_sales": decimal_str(item.jd_sales),

                "tb_price": decimal_str(item.tb_price),

                "tb_commission": decimal_str(item.tb_commission),

                "tb_commission_rate": decimal_str(item.tb_commission_rate),

                "tb_sales": decimal_str(item.tb_sales),

                "remark": item.remark or None,

                "spec": normalize_spec_payload(spec),

                "tags": _sanitize_tags(item.tags),

                "updated_at": now,

            }

            try:

                record = await client.update(

                    "sourcing_items",

                    updates,

                    {"id": f"eq.{existing['id']}"}

                )

            except SupabaseError as exc:

                raise HTTPException(status_code=500, detail=str(exc.message))

            if record:
                normalized = normalize_sourcing_item(record[0])
                updated_items.append(normalized)
                try:
                    await sync_scheme_item_fields(client, update.id, normalized)
                except Exception:
                    pass

            continue



        counter += 1

        uid = f"{prefix}{str(counter).zfill(3)}"

        jd_price = item.jd_price if item.jd_price is not None else item.price
        jd_commission = (
            item.jd_commission if item.jd_commission is not None else item.commission
        )
        jd_commission_rate = (
            item.jd_commission_rate
            if item.jd_commission_rate is not None
            else item.commission_rate
        )

        rows.append({

            "category_id": payload.category_id,

            "uid": uid,

            "title": title,

            "link": item.link or None,

            "taobao_link": item.taobao_link or None,

            "price": decimal_str(jd_price),

            "commission": decimal_str(jd_commission),

            "commission_rate": decimal_str(jd_commission_rate),

            "jd_price": decimal_str(jd_price),

            "jd_commission": decimal_str(jd_commission),

            "jd_commission_rate": decimal_str(jd_commission_rate),

            "jd_sales": decimal_str(item.jd_sales),

            "tb_price": decimal_str(item.tb_price),

            "tb_commission": decimal_str(item.tb_commission),

            "tb_commission_rate": decimal_str(item.tb_commission_rate),

            "tb_sales": decimal_str(item.tb_sales),

            "source_type": item.source_type or "manual",

            "source_ref": item.source_ref or None,

            "cover_url": item.cover_url or None,

            "remark": item.remark or None,

            "spec": normalize_spec_payload(spec),

            "tags": _sanitize_tags(item.tags),

            "created_at": now,

            "updated_at": now,

        })



    inserted_items = []

    if rows:

        try:

            inserted_items = await client.insert("sourcing_items", rows)

            await client.update(

                "sourcing_categories",

                {"uid_counter": counter, "uid_prefix": prefix, "updated_at": now},

                {"id": f"eq.{payload.category_id}"}

            )

        except SupabaseError as exc:

            raise HTTPException(status_code=500, detail=str(exc.message))



    inserted = len(inserted_items or [])

    updated = len(updated_items)

    summary = {

        "total": len(payload.items),

        "inserted": inserted,

        "updated": updated,

        "skipped": skipped_count,

        "processed": inserted + updated + skipped_count,

    }

    items = [normalize_sourcing_item(item) for item in (inserted_items or [])] + updated_items

    return {

        "items": items,

        "summary": summary,

        "category": normalize_sourcing_category({**cat, "uid_counter": counter})

    }

@router.post("/api/sourcing/items/ai-fill")

async def ai_fill_sourcing_items(payload: AiFillRequest, request: Request):
    """
    AI 填充商品参数（返回预览，不写入数据库）

    Args:
        payload: 包含 category_id、mode、product_names
    """
    client = ensure_supabase()

    # 获取品类信息
    categories = await client.select("sourcing_categories", {"id": f"eq.{payload.category_id}"})
    if not categories:
        raise HTTPException(status_code=404, detail="品类不存在")

    category = categories[0]
    category_name = category.get("name", "")

    # 获取预设字段（保留完整结构，包含 example）
    spec_fields_raw = category.get("spec_fields") or []
    if not spec_fields_raw:
        raise HTTPException(status_code=400, detail="该品类没有预设参数字段")

    # 提取字段名用于返回
    spec_field_keys = [f.get("key") for f in spec_fields_raw if f.get("key")]

    # 获取商品列表
    product_names: List[str] = []

    if payload.mode == "single":
        if not payload.product_names:
            raise HTTPException(status_code=400, detail="single 模式需要提供 product_names")
        product_names = payload.product_names

    elif payload.mode == "batch":
        # 获取该品类下所有商品
        items = await client.select("sourcing_items", {"category_id": f"eq.{payload.category_id}"})
        product_names = [item.get("title", "") for item in items if item.get("title")]

    elif payload.mode == "selected":
        if not payload.product_names:
            raise HTTPException(status_code=400, detail="selected 模式需要提供 product_names")
        product_names = payload.product_names

    else:
        raise HTTPException(status_code=400, detail="无效的 mode，应为 single/batch/selected")

    if not product_names:
        raise HTTPException(status_code=404, detail="没有找到商品")

    # 调用 AI 获取参数（传入完整的 spec_fields_raw）
    result = await ai_fill_product_params(
        category_name,
        spec_fields_raw,
        product_names,
        model_override=payload.model,
    )

    return {
        "preview": result,
        "spec_fields": spec_field_keys,
        "count": len(result)
    }

@router.post("/api/sourcing/items/ai-confirm")

async def ai_confirm_sourcing_items(payload: AiConfirmRequest, request: Request):
    """
    确认后将 AI 填充的参数写入数据库

    Args:
        payload: 包含 category_id 和 items（商品参数列表）
    """
    client = ensure_supabase()

    # 获取品类信息（用于获取 spec_fields）
    categories = await client.select("sourcing_categories", {"id": f"eq.{payload.category_id}"})
    if not categories:
        raise HTTPException(status_code=404, detail="品类不存在")

    category = categories[0]
    spec_fields_raw = category.get("spec_fields") or []
    spec_fields = [f.get("key") for f in spec_fields_raw if f.get("key")]

    updated_count = 0
    not_found_count = 0

    for item_data in payload.items:
        product_name = item_data.get("name", "").strip()
        if not product_name:
            continue

        # 查找对应商品
        existing_items = await client.select(
            "sourcing_items",
            {
                "category_id": f"eq.{payload.category_id}",
                "title": f"eq.{product_name}"
            }
        )

        if not existing_items:
            not_found_count += 1
            continue

        existing_item = existing_items[0]
        item_id = existing_item.get("id")

        # 构建 spec 更新
        spec: Dict[str, Any] = {}

        # 仅写入有值字段
        for field in spec_fields:
            value = item_data.get(field, "")
            if value:
                spec[field] = value

        # 合并已有 spec 字段
        existing_spec = existing_item.get("spec") or {}
        merged_spec = {**existing_spec, **spec}

        review_text = str(item_data.get("评价") or item_data.get("remark") or "").strip()
        existing_remark = str(existing_item.get("remark") or "").strip()

        updates = {
            "spec": normalize_spec_payload(merged_spec),
            "updated_at": utc_now_iso(),
        }
        if review_text and not existing_remark:
            updates["remark"] = review_text

        # 执行更新
        await client.update(
            "sourcing_items",
            updates,
            {"id": f"eq.{item_id}"}
        )

        updated_count += 1

    return {
        "status": "ok",
        "updated_count": updated_count,
        "not_found_count": not_found_count
    }

@router.post("/api/sourcing/items/ai-batch/start")

async def ai_batch_start(payload: AiBatchStartRequest, request: Request):
    client = ensure_supabase()
    items, category_id = await resolve_sourcing_ai_batch_items(client, payload)
    if not category_id:
        raise HTTPException(status_code=400, detail="\u8bf7\u9009\u62e9\u54c1\u7c7b")
    categories = await client.select("sourcing_categories", {"id": f"eq.{category_id}"})
    if not categories:
        raise HTTPException(status_code=404, detail="\u54c1\u7c7b\u4e0d\u5b58\u5728")
    category = categories[0]
    spec_fields_raw = category.get("spec_fields") or []
    if not spec_fields_raw:
        raise HTTPException(status_code=400, detail="\u8be5\u54c1\u7c7b\u6ca1\u6709\u9884\u8bbe\u53c2\u6570\u5b57\u6bb5")
    if not items:
        raise HTTPException(status_code=404, detail="\u6ca1\u6709\u627e\u5230\u5546\u54c1")
    job_state = create_sourcing_ai_job_state(total=len(items))
    asyncio.create_task(
        run_sourcing_ai_batch_job(
            job_state["id"],
            items,
            category.get("name", ""),
            spec_fields_raw,
            payload.model,
        )
    )
    return {"status": "queued", "job_id": job_state["id"], "total": len(items)}

@router.get("/api/sourcing/items/ai-batch/status/{job_id}")

async def ai_batch_status(job_id: str):
    state = get_sourcing_ai_job_state(job_id)
    if not state:
        raise HTTPException(status_code=404, detail="\u4efb\u52a1\u4e0d\u5b58\u5728")
    return state

@router.patch("/api/sourcing/items/{item_id}")

async def patch_sourcing_item(item_id: str, payload: SourcingItemUpdate, request: Request):

    client = ensure_supabase()

    updates: Dict[str, Any] = {}

    if payload.title is not None:

        title = payload.title.strip()

        if not title:

            raise HTTPException(status_code=400, detail="选品标题不能为空")

        updates["title"] = title

    if payload.link is not None:

        updates["link"] = payload.link or None

    if payload.taobao_link is not None:

        updates["taobao_link"] = payload.taobao_link or None

    if payload.category_id is not None:

        category_id = payload.category_id.strip()

        if not category_id:

            raise HTTPException(status_code=400, detail="category_id cannot be empty")

        category = await client.select("sourcing_categories", {"id": f"eq.{category_id}"})

        if not category:

            raise HTTPException(status_code=404, detail="category not found")

        updates["category_id"] = category_id

    if payload.price is not None:

        updates["price"] = decimal_str(payload.price)
        if payload.jd_price is None:
            updates["jd_price"] = decimal_str(payload.price)

    if payload.commission is not None:

        updates["commission"] = decimal_str(payload.commission)
        if payload.jd_commission is None:
            updates["jd_commission"] = decimal_str(payload.commission)

    if payload.commission_rate is not None:

        updates["commission_rate"] = decimal_str(payload.commission_rate)
        if payload.jd_commission_rate is None:
            updates["jd_commission_rate"] = decimal_str(payload.commission_rate)

    if payload.jd_price is not None:
        updates["jd_price"] = decimal_str(payload.jd_price)
        updates["price"] = decimal_str(payload.jd_price)

    if payload.jd_commission is not None:
        updates["jd_commission"] = decimal_str(payload.jd_commission)
        updates["commission"] = decimal_str(payload.jd_commission)

    if payload.jd_commission_rate is not None:
        updates["jd_commission_rate"] = decimal_str(payload.jd_commission_rate)
        updates["commission_rate"] = decimal_str(payload.jd_commission_rate)

    if payload.jd_sales is not None:
        updates["jd_sales"] = decimal_str(payload.jd_sales)

    if payload.tb_price is not None:
        updates["tb_price"] = decimal_str(payload.tb_price)

    if payload.tb_commission is not None:
        updates["tb_commission"] = decimal_str(payload.tb_commission)

    if payload.tb_commission_rate is not None:
        updates["tb_commission_rate"] = decimal_str(payload.tb_commission_rate)

    if payload.tb_sales is not None:
        updates["tb_sales"] = decimal_str(payload.tb_sales)

    if payload.source_ref is not None:

        updates["source_ref"] = payload.source_ref or None

    if payload.cover_url is not None:

        updates["cover_url"] = payload.cover_url or None

    if payload.remark is not None:

        updates["remark"] = payload.remark or None

    if payload.spec is not None:
        raw_spec = None
        try:
            raw_payload = await request.json()
            if isinstance(raw_payload, dict):
                raw_spec = raw_payload.get("spec")
        except Exception:
            raw_spec = None

        merged_spec = merge_spec_payload(payload.spec, raw_spec)
        updates["spec"] = normalize_spec_payload(merged_spec or {})

    if payload.tags is not None:

        updates["tags"] = _sanitize_tags(payload.tags)

    if not updates:

        raise HTTPException(status_code=400, detail="没有需要更新的内容")

    updates["updated_at"] = utc_now_iso()

    try:

        record = await client.update("sourcing_items", updates, {"id": f"eq.{item_id}"})

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    if not record:

        raise HTTPException(status_code=404, detail="选品不存在")

    updated_item = normalize_sourcing_item(record[0])
    if any(key in updates for key in SCHEME_SYNC_FIELDS):
        try:
            await sync_scheme_item_fields(client, item_id, updated_item)
        except Exception:
            pass

    return {"item": updated_item}

@router.post("/api/sourcing/covers")

async def upload_sourcing_cover(file: UploadFile = File(...)):

    """上传选品封面到 Supabase Storage"""

    client = ensure_supabase()

    if not file:

        raise HTTPException(status_code=400, detail="未上传封面")

    contents = await file.read()

    if not contents:

        raise HTTPException(status_code=400, detail="封面为空")

    bucket = "sourcing-covers"

    filename = f"{int(time.time() * 1000)}.jpg"

    storage_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{filename}"

    headers = {

        "apikey": SUPABASE_SERVICE_ROLE_KEY,

        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",

        "Content-Type": file.content_type or "image/jpeg",

        "x-upsert": "true"

    }

    try:

        response = await client._client.post(storage_url, content=contents, headers=headers)

    except httpx.RequestError as exc:

        raise HTTPException(status_code=502, detail=f"上传封面失败: {exc}") from exc

    if response.status_code >= 400:

        message = response.text or "上传封面失败"

        try:

            detail = response.json()

            if isinstance(detail, dict):

                message = detail.get("message") or detail.get("error") or message

        except ValueError:

            pass

        raise HTTPException(status_code=response.status_code, detail=f"上传封面失败: {message}")

    public_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{bucket}/{filename}"

    return {"url": public_url, "path": filename}

@router.post("/api/sourcing/batch-cover")

async def batch_upload_cover_with_uid(file: UploadFile = File(...), uid: str = Form(...)):

    """批量上传封面并自动更新对应商品的封面，同时删除旧封面"""

    client = ensure_supabase()

    if not file:

        raise HTTPException(status_code=400, detail="未上传封面")

    if not uid:

        raise HTTPException(status_code=400, detail="未提供商品UID")

    # 1. 先查询商品，获取旧封面URL
    items = await client.select("sourcing_items", params={"uid": f"eq.{uid}"})

    if not items or len(items) == 0:

        return {

            "success": False,

            "uid": uid,

            "message": f"找不到UID为 {uid} 的商品",

        }

    item = items[0]

    old_cover_url = item.get("cover_url")

    # 2. 上传新文件到 Supabase Storage
    contents = await file.read()

    if not contents:

        raise HTTPException(status_code=400, detail="封面为空")

    bucket = "sourcing-covers"

    # 使用 uid 作为文件名前缀，保留原始扩展名
    ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
    filename = f"{uid}_{int(time.time() * 1000)}.{ext}"

    storage_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{bucket}/{filename}"

    headers = {

        "apikey": SUPABASE_SERVICE_ROLE_KEY,

        "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",

        "Content-Type": file.content_type or "image/jpeg",

        "x-upsert": "true"

    }

    try:

        response = await client._client.post(storage_url, content=contents, headers=headers)

    except httpx.RequestError as exc:

        raise HTTPException(status_code=502, detail=f"上传封面失败: {exc}") from exc

    if response.status_code >= 400:

        message = response.text or "上传封面失败"

        try:

            detail = response.json()

            if isinstance(detail, dict):

                message = detail.get("message") or detail.get("error") or message

        except ValueError:

            pass

        raise HTTPException(status_code=response.status_code, detail=f"上传封面失败: {message}")

    public_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/public/{bucket}/{filename}"

    # 3. 删除旧封面（如果有）
    if old_cover_url:

        await delete_old_cover(old_cover_url)

    # 4. 更新数据库
    try:

        item_id = item.get("id")

        updates = {

            "cover_url": public_url,

            "updated_at": utc_now_iso()

        }

        await client.update("sourcing_items", updates, {"id": f"eq.{item_id}"})
        try:
            await sync_scheme_item_cover(client, item_id, public_url)
        except Exception:
            pass

        return {

            "success": True,

            "uid": uid,

            "item_id": item_id,

            "message": "封面更新成功",

            "url": public_url,

            "old_cover_deleted": bool(old_cover_url)

        }

    except Exception as exc:

        return {

            "success": False,

            "uid": uid,

            "message": f"更新商品失败: {str(exc)}",

            "url": public_url

        }

@router.delete("/api/sourcing/items/{item_id}")

async def delete_sourcing_item(item_id: str):

    client = ensure_supabase()

    existing = await client.select("sourcing_items", {"id": f"eq.{item_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="选品不存在")

    await client.delete("sourcing_items", {"id": f"eq.{item_id}"})

    return {"status": "ok"}

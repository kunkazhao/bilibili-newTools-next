from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, Query

router = APIRouter()

try:
    import core as core
except Exception:
    from backend import core as core

PROMPT_TEMPLATE_DEFAULTS = core.PROMPT_TEMPLATE_DEFAULTS
PROMPT_TEMPLATE_LOCK = core.PROMPT_TEMPLATE_LOCK
PROMPT_TEMPLATE_OVERRIDES = core.PROMPT_TEMPLATE_OVERRIDES
PromptTemplateUpdate = core.PromptTemplateUpdate
SchemeCreate = core.SchemeCreate
SchemeUpdate = core.SchemeUpdate
SupabaseError = core.SupabaseError
ensure_supabase = core.ensure_supabase
get_prompt_template_overrides = core.get_prompt_template_overrides
load_local_image_templates = core.load_local_image_templates
normalize_scheme = core.normalize_scheme
save_prompt_template_overrides = core.save_prompt_template_overrides
utc_now_iso = core.utc_now_iso


@router.get("/api/schemes")

async def list_schemes(category_id: Optional[str] = None):

    client = ensure_supabase()

    params = {

        "select": "id,name,category_id,category_name,remark,items,created_at,updated_at",

        "order": "created_at.desc"

    }

    if category_id:

        params["category_id"] = f"eq.{category_id}"

    try:

        rows = await client.select("schemes", params=params)

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    return {"schemes": [normalize_scheme(row) for row in rows]}

@router.get("/api/schemes/{scheme_id}")

async def get_scheme(scheme_id: str):

    client = ensure_supabase()

    try:

        rows = await client.select("schemes", {"id": f"eq.{scheme_id}"})

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    if not rows:

        raise HTTPException(status_code=404, detail="方案不存在")

    return {"scheme": normalize_scheme(rows[0])}

@router.post("/api/schemes")

async def create_scheme(payload: SchemeCreate):

    client = ensure_supabase()

    name = payload.name.strip()

    category_id = payload.category_id.strip()

    if not name:

        raise HTTPException(status_code=400, detail="方案名称不能为空")

    if not category_id:

        raise HTTPException(status_code=400, detail="品类不能为空")

    body = {

        "name": name,

        "category_id": category_id,

        "category_name": (payload.category_name or "").strip() or None,

        "remark": (payload.remark or "").strip() or None,

        "items": payload.items or [],

        "created_at": utc_now_iso(),

        "updated_at": utc_now_iso()

    }

    try:

        record = await client.insert("schemes", body)

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    return {"scheme": normalize_scheme(record[0])}

@router.patch("/api/schemes/{scheme_id}")

async def update_scheme(scheme_id: str, payload: SchemeUpdate):

    client = ensure_supabase()

    updates: Dict[str, Any] = {}

    if payload.name is not None:

        name = payload.name.strip()

        if not name:

            raise HTTPException(status_code=400, detail="方案名称不能为空")

        updates["name"] = name

    if payload.category_id is not None:

        category_id = payload.category_id.strip()

        if not category_id:

            raise HTTPException(status_code=400, detail="品类不能为空")

        updates["category_id"] = category_id

    if payload.category_name is not None:

        updates["category_name"] = payload.category_name.strip() or None

    if payload.remark is not None:

        updates["remark"] = payload.remark.strip() or None

    if payload.items is not None:

        updates["items"] = payload.items

    if not updates:

        raise HTTPException(status_code=400, detail="没有需要更新的内容")

    updates["updated_at"] = utc_now_iso()

    try:

        record = await client.update("schemes", updates, {"id": f"eq.{scheme_id}"})

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    if not record:

        raise HTTPException(status_code=404, detail="方案不存在")

    return {"scheme": normalize_scheme(record[0])}

@router.delete("/api/schemes/{scheme_id}")

async def delete_scheme(scheme_id: str):

    client = ensure_supabase()

    try:

        existing = await client.select("schemes", {"id": f"eq.{scheme_id}"})

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    if not existing:

        raise HTTPException(status_code=404, detail="方案不存在")

    try:

        await client.delete("schemes", {"id": f"eq.{scheme_id}"})

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    return {"status": "ok"}

@router.get("/api/image/templates")
async def list_image_templates():
    templates = load_local_image_templates()
    return {"templates": templates}

@router.get("/api/prompts")
async def list_prompt_templates(keys: Optional[str] = Query(None)):
    key_list: List[str] = []
    if keys:
        key_list = [key.strip() for key in keys.split(",") if key.strip()]
    templates = get_prompt_template_overrides(key_list or None)
    return {"templates": templates}

@router.patch("/api/prompts/{key}")
async def update_prompt_template(key: str, payload: PromptTemplateUpdate):
    if key not in PROMPT_TEMPLATE_DEFAULTS:
        raise HTTPException(status_code=404, detail="提示词不存在")
    content = (payload.content or "").strip()
    with PROMPT_TEMPLATE_LOCK:
        if content:
            PROMPT_TEMPLATE_OVERRIDES[key] = content
        else:
            PROMPT_TEMPLATE_OVERRIDES.pop(key, None)
        save_prompt_template_overrides()
    return {"status": "ok", "template": content or PROMPT_TEMPLATE_DEFAULTS[key]}

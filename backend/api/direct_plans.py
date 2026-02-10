from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()

try:
    import core as core
except Exception:
    from backend import core as core

globals().update({k: v for k, v in core.__dict__.items() if not k.startswith("_")})


def ensure_supabase(*args, **kwargs):
    return core.ensure_supabase(*args, **kwargs)


def utc_now_iso(*args, **kwargs):
    return core.utc_now_iso(*args, **kwargs)


class DirectPlanCreate(BaseModel):
    platform: str
    category: str
    brand: str
    plan_link: str
    commission_rate: Optional[str] = None


class DirectPlanUpdate(BaseModel):
    platform: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    plan_link: Optional[str] = None
    commission_rate: Optional[str] = None


class DirectPlanReorder(BaseModel):
    ids: List[str]


def normalize_direct_plan(row: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": row.get("id"),
        "platform": row.get("platform"),
        "category": row.get("category"),
        "brand": row.get("brand"),
        "plan_link": row.get("plan_link"),
        "commission_rate": row.get("commission_rate"),
        "sort_order": row.get("sort_order"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


@router.get("/api/direct-plans")
async def list_direct_plans():
    client = ensure_supabase()
    try:
        rows = await client.select(
            "direct_plans",
            params={"order": "sort_order.asc.nullslast,created_at.desc"},
        )
    except SupabaseError as exc:
        if "sort_order" in str(exc.message):
            rows = await client.select("direct_plans", params={"order": "created_at.desc"})
        else:
            raise HTTPException(status_code=500, detail=str(exc.message))
    return {"plans": [normalize_direct_plan(row) for row in rows]}


@router.post("/api/direct-plans")
async def create_direct_plan(payload: DirectPlanCreate | Dict[str, Any]):
    if isinstance(payload, dict):
        payload = DirectPlanCreate(**payload)
    client = ensure_supabase()
    platform = (payload.platform or "").strip()
    category = (payload.category or "").strip()
    brand = (payload.brand or "").strip()
    plan_link = (payload.plan_link or "").strip()
    if not platform or not category or not brand:
        raise HTTPException(status_code=400, detail="平台/分类/品牌不能为空")
    if not plan_link:
        raise HTTPException(status_code=400, detail="定向计划链接不能为空")

    sort_order: Optional[int] = None
    try:
        rows = await client.select(
            "direct_plans",
            params={
                "select": "sort_order,created_at",
                "order": "sort_order.asc.nullslast,created_at.desc",
                "limit": 1,
            },
        )
        if rows:
            base = rows[0].get("sort_order")
            sort_order = (int(base) - 10) if base is not None else 0
        else:
            sort_order = 0
    except SupabaseError as exc:
        if "sort_order" in str(exc.message):
            sort_order = 0
        else:
            raise HTTPException(status_code=500, detail=str(exc.message))

    now = utc_now_iso()
    body = {
        "platform": platform,
        "category": category,
        "brand": brand,
        "plan_link": plan_link,
        "commission_rate": (payload.commission_rate or "").strip() or None,
        "sort_order": sort_order,
        "created_at": now,
        "updated_at": now,
    }
    record = await client.insert("direct_plans", body)
    return {"plan": normalize_direct_plan(record[0])}


@router.patch("/api/direct-plans/{plan_id}")
async def update_direct_plan(plan_id: str, payload: DirectPlanUpdate):
    client = ensure_supabase()
    updates: Dict[str, Any] = {}
    if payload.platform is not None:
        value = payload.platform.strip()
        if not value:
            raise HTTPException(status_code=400, detail="平台不能为空")
        updates["platform"] = value
    if payload.category is not None:
        value = payload.category.strip()
        if not value:
            raise HTTPException(status_code=400, detail="分类不能为空")
        updates["category"] = value
    if payload.brand is not None:
        value = payload.brand.strip()
        if not value:
            raise HTTPException(status_code=400, detail="品牌不能为空")
        updates["brand"] = value
    if payload.plan_link is not None:
        value = payload.plan_link.strip()
        if not value:
            raise HTTPException(status_code=400, detail="定向计划链接不能为空")
        updates["plan_link"] = value
    if payload.commission_rate is not None:
        updates["commission_rate"] = payload.commission_rate.strip() or None
    if not updates:
        raise HTTPException(status_code=400, detail="没有需要更新的内容")
    updates["updated_at"] = utc_now_iso()
    record = await client.update("direct_plans", updates, {"id": f"eq.{plan_id}"})
    if not record:
        raise HTTPException(status_code=404, detail="定向计划不存在")
    return {"plan": normalize_direct_plan(record[0])}


@router.delete("/api/direct-plans/{plan_id}")
async def delete_direct_plan(plan_id: str):
    client = ensure_supabase()
    existing = await client.select("direct_plans", {"id": f"eq.{plan_id}"})
    if not existing:
        raise HTTPException(status_code=404, detail="定向计划不存在")
    await client.delete("direct_plans", {"id": f"eq.{plan_id}"})
    return {"status": "ok"}


@router.post("/api/direct-plans/reorder")
async def reorder_direct_plans(payload: DirectPlanReorder | Dict[str, Any]):
    if isinstance(payload, dict):
        payload = DirectPlanReorder(**payload)
    ids = payload.ids
    if not ids:
        raise HTTPException(status_code=400, detail="排序列表不能为空")
    client = ensure_supabase()
    now = utc_now_iso()
    rows = [
        {"id": plan_id, "sort_order": index, "updated_at": now}
        for index, plan_id in enumerate(ids)
    ]
    await client.upsert("direct_plans", rows, on_conflict="id")
    return {"status": "ok"}

import json
import logging
import re
from typing import Any, Set
from urllib.parse import parse_qs, urlparse

import aiohttp
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse

router = APIRouter()

try:
    import core as core
except Exception:
    from backend import core as core

logger = logging.getLogger(__name__)

JdImageRequest = core.JdImageRequest
JD_SCENE_ID = core.JD_SCENE_ID
JD_ELITE_ID = core.JD_ELITE_ID


def _core_attr(name: str):
    return getattr(core, name)


def build_bilibili_headers(*args, **kwargs):
    return _core_attr("build_bilibili_headers")(*args, **kwargs)


def extract_jd_sku_from_url(*args, **kwargs):
    return _core_attr("extract_jd_sku_from_url")(*args, **kwargs)


def fetch_jd_page(*args, **kwargs):
    return _core_attr("fetch_jd_page")(*args, **kwargs)


def extract_jd_images_from_html(*args, **kwargs):
    return _core_attr("extract_jd_images_from_html")(*args, **kwargs)


def select_best_jd_image(*args, **kwargs):
    return _core_attr("select_best_jd_image")(*args, **kwargs)


def extract_taobao_item_id(*args, **kwargs):
    return _core_attr("extract_taobao_item_id")(*args, **kwargs)


def taobao_item_details(*args, **kwargs):
    return _core_attr("taobao_item_details")(*args, **kwargs)


def resolve_taobao_url(*args, **kwargs):
    return _core_attr("resolve_taobao_url")(*args, **kwargs)


def taobao_click_extract(*args, **kwargs):
    return _core_attr("taobao_click_extract")(*args, **kwargs)


TAOBAO_TITLE_BLACKLIST = {
    "\u5546\u54C1\u8BE6\u60C5",
    "\u5B9D\u8D1D\u63CF\u8FF0",
    "\u5356\u5BB6\u670D\u52A1",
    "\u7269\u6D41\u670D\u52A1",
    "\u4FDD\u969C\u670D\u52A1",
    "\u5B9D\u8D1D\u8D28\u91CF",
    "\u7269\u6D41\u901F\u5EA6",
    "\u670D\u52A1\u4FDD\u969C",
}


def extract_taobao_sku_id_from_url(raw_url: str) -> str:
    value = str(raw_url or "").strip()
    if not value:
        return ""

    try:
        query = parse_qs(urlparse(value).query)
        for key in ("skuId", "skuid", "sku_id"):
            candidates = query.get(key) or query.get(key.lower())
            if candidates:
                candidate = str(candidates[0] or "").strip()
                if re.fullmatch(r"\d{8,}", candidate):
                    return candidate
    except Exception:
        pass

    match = re.search(r"(?:skuId|skuid|sku_id)[=/](\d{8,})", value, flags=re.IGNORECASE)
    return match.group(1) if match else ""


def _decode_js_string(raw: str) -> str:
    value = str(raw or "")
    if "\\u" in value:
        try:
            return bytes(value, "utf-8").decode("unicode_escape")
        except Exception:
            return value
    return value


def _normalize_price_text(raw: Any) -> str:
    value = str(raw or "").strip().replace("\u00A5", "").replace("\u5143", "")
    if not value:
        return ""
    match = re.search(r"(\d+(?:\.\d+)?)", value)
    return match.group(1) if match else ""


def _extract_json_object_by_key(raw_html: str, key: str) -> dict:
    if not raw_html or not key:
        return {}

    needle = f'"{key}":{{'
    idx = raw_html.find(needle)
    if idx < 0:
        return {}

    start = idx + len(f'"{key}":')
    depth = 0
    end = None

    for cursor, ch in enumerate(raw_html[start:], start=start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = cursor + 1
                break

    if not end:
        return {}

    try:
        return json.loads(raw_html[start:end])
    except Exception:
        return {}


def _extract_price_from_sku_obj(sku_obj: dict) -> str:
    if not isinstance(sku_obj, dict):
        return ""

    for bucket in ("subPrice", "price"):
        node = sku_obj.get(bucket)
        if not isinstance(node, dict):
            continue
        price_text = _normalize_price_text(node.get("priceText") or node.get("priceMoney"))
        if price_text:
            return price_text

    return ""


def _iter_sku_keys(raw_html: str):
    seen = set()
    for match in re.finditer(r'"(\d{10,})":\{', raw_html or ""):
        sku_key = match.group(1)
        if sku_key in seen:
            continue
        seen.add(sku_key)
        yield sku_key


def _extract_title_from_html(raw_html: str) -> str:
    if not raw_html:
        return ""

    title_candidates = []
    pattern = r'"(?:itemName|title|skuName)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"'
    for raw in re.findall(pattern, raw_html, flags=re.IGNORECASE):
        decoded = _decode_js_string(raw).strip()
        if not decoded or decoded in TAOBAO_TITLE_BLACKLIST:
            continue
        title_candidates.append(decoded)

    if title_candidates:
        return sorted(title_candidates, key=len, reverse=True)[0]

    title_match = re.search(r"<title>(.*?)</title>", raw_html, flags=re.IGNORECASE | re.DOTALL)
    if not title_match:
        return ""

    title_text = title_match.group(1).strip()
    return "" if title_text in TAOBAO_TITLE_BLACKLIST else title_text


def parse_taobao_detail_html(raw_html: str, sku_id: str = "") -> dict:
    html_text = str(raw_html or "")
    if not html_text:
        return {}

    title = _extract_title_from_html(html_text)

    price = ""
    target_sku = str(sku_id or "").strip()
    if target_sku:
        price = _extract_price_from_sku_obj(_extract_json_object_by_key(html_text, target_sku))

    if not price:
        for candidate_sku in _iter_sku_keys(html_text):
            price = _extract_price_from_sku_obj(_extract_json_object_by_key(html_text, candidate_sku))
            if price:
                break

    payload = {}
    if title:
        payload["title"] = title
    if price:
        payload["price"] = price
    return payload


async def fetch_taobao_detail_fallback(source_url: str, item_id: str) -> dict:
    source = str(source_url or "").strip()
    pid = str(item_id or "").strip()

    candidates = []
    if source:
        candidates.append(source)
    if pid:
        candidates.append(f"https://detail.tmall.com/item.htm?id={pid}")
        candidates.append(f"https://item.taobao.com/item.htm?id={pid}")

    if not candidates:
        return {}

    cookie = str(getattr(core, "TAOBAO_COOKIE", "") or "").strip()
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/132.0.0.0 Safari/537.36"
        ),
        "Accept-Language": "zh-CN,zh;q=0.9",
        "Referer": "https://pub.alimama.com/",
    }
    if cookie:
        headers["Cookie"] = cookie

    seen = set()
    timeout = aiohttp.ClientTimeout(total=20)
    async with aiohttp.ClientSession(headers=headers, timeout=timeout) as session:
        for target in candidates:
            url = str(target or "").strip()
            if not url or url in seen:
                continue
            seen.add(url)
            try:
                async with session.get(url, allow_redirects=True) as response:
                    final_url = str(response.url)
                    html_text = await response.text(errors="ignore")
            except Exception:
                continue

            sku = extract_taobao_sku_id_from_url(source or final_url)
            parsed = parse_taobao_detail_html(html_text, sku)
            if final_url:
                parsed["materialUrl"] = final_url
            if parsed.get("title") or parsed.get("price"):
                return parsed

    return {}

@router.post("/api/jd/product")

async def jd_product_proxy(request: dict):

    """代理请求京东商品查询 API，解决 CORS 问题"""

    try:

        keyword = request.get("keyword")

        if not keyword:

            raise HTTPException(status_code=400, detail="缺少 keyword 参数")

        # 京东商品查询 API (mofaxiang.com)

        api_url = "https://mofaxiang.com/api/tools/jd/goods-query-2mei"



        headers = {

            "Content-Type": "application/json",

            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

        }



        payload = {

            "keyword": keyword,

        }

        if JD_SCENE_ID:

            payload["sceneId"] = JD_SCENE_ID

        if JD_ELITE_ID:

            payload["eliteId"] = JD_ELITE_ID



        logger.info(f"[京东API] 查询商品: {keyword[:80]}...")



        async with aiohttp.ClientSession() as session:

            async with session.post(api_url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as response:

                if response.status != 200:

                    raise HTTPException(status_code=500, detail=f"API请求失败: {response.status}")



                data = await response.json()

                logger.info(f"[京东API] 响应code: {data.get('code')}, msg: {data.get('msg')}")

                return JSONResponse(content=data)



    except HTTPException:

        raise

    except Exception as e:

        logger.info(f"[京东API] 错误: {e}")

        raise HTTPException(status_code=500, detail=f"获取商品信息失败: {str(e)}")

@router.post("/api/jd/main-image")

async def jd_main_image(request: JdImageRequest):

    link = (request.url or "").strip()

    if not link:

        raise HTTPException(status_code=400, detail="请提供京东商品链接")



    sku = extract_jd_sku_from_url(link)

    target_url = link

    if sku:

        target_url = f"https://item.jd.com/{sku}.html"



    try:

        html_content = await fetch_jd_page(target_url)

        images = extract_jd_images_from_html(html_content)

        needs_mobile = not images or not any('/n0/' in (img or '') for img in images)

        if needs_mobile and sku:

            mobile_url = f"https://item.m.jd.com/product/{sku}.html"

            try:

                mobile_html = await fetch_jd_page(mobile_url)

                mobile_images = extract_jd_images_from_html(mobile_html)

                if mobile_images:

                    images = mobile_images

            except Exception as mobile_error:

                logger.info(f"[JD] mobile fetch failed: {mobile_error}")

        best_image = select_best_jd_image(images)

        if not best_image:

            raise HTTPException(status_code=404, detail="未能在页面中找到主图")

        return {

            "status": "success",

            "sku": sku,

            "source": target_url,

            "image": best_image,

            "candidates": images

        }

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(status_code=500, detail=f"获取主图失败: {str(e)}")

@router.post("/api/taobao/resolve")
async def taobao_resolve(request: dict):
    """Resolve Taobao/Tmall link and return product IDs for mapping."""
    url = (request or {}).get("url") or ""
    url = str(url).strip()
    if not url:
        raise HTTPException(status_code=400, detail="Missing url")

    resolved_url, page_text = await resolve_taobao_url(url)
    parsed_item_id = extract_taobao_item_id(f"{resolved_url}\n{page_text}\n{url}")

    candidates = [resolved_url, url]
    seen: Set[str] = set()
    for candidate in candidates:
        normalized = str(candidate or "").strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        try:
            extracted = await taobao_click_extract(normalized)
        except Exception:
            extracted = {}
        item_id = str(extracted.get("itemId") or "").strip()
        open_iid = str(extracted.get("openIid") or "").strip()
        if item_id or open_iid:
            return {
                "itemId": item_id or parsed_item_id,
                "openIid": open_iid,
                "sourceLink": url,
                "resolvedUrl": resolved_url,
            }

    return {
        "itemId": parsed_item_id,
        "openIid": "",
        "sourceLink": url,
        "resolvedUrl": resolved_url,
    }

@router.post("/api/taobao/product")
async def taobao_product_info(request: dict):
    """Fetch Taobao product details with HTML fallback when API data is unavailable."""
    payload = request or {}
    item_id = str(payload.get("item_id") or "").strip()
    open_iid = str(payload.get("open_iid") or "").strip()
    source_url = str(
        payload.get("source_url")
        or payload.get("url")
        or payload.get("resolved_url")
        or ""
    ).strip()

    if not item_id and open_iid:
        item_id = open_iid

    if not item_id and source_url:
        item_id = extract_taobao_item_id(source_url)

    if not item_id and not source_url:
        raise HTTPException(status_code=400, detail="missing item_id/open_iid/source_url")

    detail_data: dict = {}
    detail_error: Exception | None = None

    if item_id:
        try:
            detail_data = await taobao_item_details(item_id)
        except Exception as exc:
            detail_error = exc
            logger.warning("[taobao-product] tbk details failed, fallback to html parser")

    needs_fallback = not str(detail_data.get("title") or "").strip() or not str(
        detail_data.get("price") or ""
    ).strip()

    fallback_data = {}
    if source_url and (needs_fallback or not detail_data):
        fallback_data = await fetch_taobao_detail_fallback(source_url, item_id)

    merged = dict(detail_data or {})
    for key in ("title", "price", "materialUrl"):
        value = fallback_data.get(key)
        if value:
            merged[key] = value

    if item_id and not merged.get("itemId"):
        merged["itemId"] = item_id
    if source_url and not merged.get("materialUrl"):
        merged["materialUrl"] = source_url

    if merged.get("title") or merged.get("price"):
        return merged

    if detail_error:
        raise HTTPException(status_code=502, detail=f"taobao product fetch failed: {detail_error}")

    raise HTTPException(status_code=404, detail="failed to fetch taobao product info")


@router.post("/api/jd/resolve")
async def jd_resolve_url(request: dict):
    """Resolve short/union links and return a JD URL usable for SKU extraction."""
    import re

    def extract_jingfen_token(raw_url: str) -> str:
        if not raw_url:
            return ""
        detail_match = re.search(r"jingfen\.jd\.com/detail/([a-zA-Z0-9_-]+)\.html", raw_url)
        if detail_match:
            return detail_match.group(1)
        item_match = re.search(r"jingfen\.jd\.com/item\.html\?[^#]*?\bsku=([a-zA-Z0-9_-]+)", raw_url)
        if item_match:
            return item_match.group(1)
        return ""

    try:
        url = request.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="missing url")

        if "item.jd.com" in url:
            return {"resolvedUrl": url}

        logger.info(f"[jd-resolve] input: {url[:80]}...")

        headers = build_bilibili_headers()
        async with aiohttp.ClientSession() as session:

            async def resolve_jingfen_detail(raw_url: str) -> str:
                token = extract_jingfen_token(raw_url)
                if not token:
                    return ""
                detail_url = f"https://jingfen.jd.com/detail/{token}.html"
                try:
                    async with session.get(
                        detail_url,
                        headers=headers,
                        allow_redirects=False,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as detail_resp:
                        location = detail_resp.headers.get("Location") or ""
                        if "item.jd.com" in location:
                            return location
                except Exception:
                    pass

                try:
                    async with session.get(
                        detail_url,
                        headers=headers,
                        allow_redirects=True,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as detail_follow:
                        for redirect in detail_follow.history:
                            redirect_url = str(redirect.url)
                            if "item.jd.com" in redirect_url:
                                return redirect_url
                        final_url = str(detail_follow.url)
                        if "item.jd.com" in final_url:
                            return final_url
                except Exception:
                    pass

                return detail_url

            async with session.get(
                url,
                headers=headers,
                allow_redirects=True,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as response:
                resolved_url = str(response.url)
                logger.info(f"[jd-resolve] resolved: {resolved_url[:80]}...")

                if response.history:
                    for redirect in response.history:
                        redirect_url = str(redirect.url)
                        if "item.jd.com" in redirect_url:
                            return {"resolvedUrl": redirect_url}

                if "item.jd.com" in resolved_url:
                    return {"resolvedUrl": resolved_url}

                # b23 -> union-click/jdc (html includes hrl) -> union-click/jda -> jingfen/item or item.jd.com
                if "union-click.jd.com/jdc" in resolved_url:
                    html = await response.text()
                    match = re.search(r"var hrl='([^']+)'", html)
                    if match:
                        jda_url = match.group(1)
                        async with session.get(
                            jda_url,
                            headers=headers,
                            allow_redirects=False,
                            timeout=aiohttp.ClientTimeout(total=10),
                        ) as jda_resp:
                            location = jda_resp.headers.get("Location") or ""
                            if "item.jd.com" in location:
                                return {"resolvedUrl": location}
                            jingfen_item = await resolve_jingfen_detail(location)
                            if jingfen_item:
                                return {"resolvedUrl": jingfen_item}

                if "union-click.jd.com/jda" in resolved_url:
                    async with session.get(
                        resolved_url,
                        headers=headers,
                        allow_redirects=False,
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as jda_resp:
                        location = jda_resp.headers.get("Location") or ""
                        if "item.jd.com" in location:
                            return {"resolvedUrl": location}
                        jingfen_item = await resolve_jingfen_detail(location)
                        if jingfen_item:
                            return {"resolvedUrl": jingfen_item}

                jingfen_item = await resolve_jingfen_detail(resolved_url)
                if jingfen_item:
                    return {"resolvedUrl": jingfen_item}

                return {"resolvedUrl": resolved_url}

    except Exception as exc:
        logger.info(f"[jd-resolve] error: {exc}")
        import traceback

        traceback.print_exc()
        return {"resolvedUrl": request.get("url", "")}

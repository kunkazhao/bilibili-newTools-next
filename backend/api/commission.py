from fastapi import APIRouter

router = APIRouter()

try:
    import main as core
except Exception:
    from backend import main as core

globals().update({k: v for k, v in core.__dict__.items() if not k.startswith("_")})


def _core_attr(name):
    return getattr(core, name)


def resolve_taobao_url(*args, **kwargs):
    return _core_attr("resolve_taobao_url")(*args, **kwargs)


def taobao_click_extract(*args, **kwargs):
    return _core_attr("taobao_click_extract")(*args, **kwargs)

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



        print(f"[京东API] 查询商品: {keyword[:80]}...")



        async with aiohttp.ClientSession() as session:

            async with session.post(api_url, json=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=15)) as response:

                if response.status != 200:

                    raise HTTPException(status_code=500, detail=f"API请求失败: {response.status}")



                data = await response.json()

                print(f"[京东API] 响应code: {data.get('code')}, msg: {data.get('msg')}")

                return JSONResponse(content=data)



    except HTTPException:

        raise

    except Exception as e:

        print(f"[京东API] 错误: {e}")

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

                print(f"[JD] mobile fetch failed: {mobile_error}")

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
    """??????????????????"""
    item_id = (request or {}).get("item_id") or ""
    open_iid = (request or {}).get("open_iid") or ""
    item_id = str(item_id).strip()
    open_iid = str(open_iid).strip()
    if not item_id and not open_iid:
        raise HTTPException(status_code=400, detail="?? item_id ? open_iid ??")
    if not item_id and open_iid:
        item_id = open_iid
    return await taobao_item_details(item_id)

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

        print(f"[jd-resolve] input: {url[:80]}...")

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
                print(f"[jd-resolve] resolved: {resolved_url[:80]}...")

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
        print(f"[jd-resolve] error: {exc}")
        import traceback

        traceback.print_exc()
        return {"resolvedUrl": request.get("url", "")}

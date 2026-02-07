from fastapi import APIRouter

router = APIRouter()

try:
    import main as core
except Exception:
    from backend import main as core

globals().update({k: v for k, v in core.__dict__.items() if not k.startswith("_")})

@router.get("/api/bilibili/proxy")
async def bilibili_proxy(url: str):
    """???? B? API??? CORS ???GET?"""
    return await handle_bilibili_proxy(url)

@router.post("/api/bilibili/proxy")
async def bilibili_proxy_post(payload: BilibiliProxyRequest):
    """???? B? API??? CORS ???POST?"""
    return await handle_bilibili_proxy(payload.url)

@router.get("/api/bilibili/resolve")

def extract_page_number(url: str) -> int:

    if not url:

        return 1

    match = re.search(r'[?&]p=(\d+)', url, re.IGNORECASE)

    if match:

        try:

            page = int(match.group(1))

            return page if page > 0 else 1

        except ValueError:

            return 1

    return 1

@router.post("/api/bilibili/video-info")

async def bilibili_video_info(request: dict):

    """获取B站视频基础信息"""

    try:

        url = request.get("url")

        final_url, bvid, avid, _ = await extract_video_identity(url)



        params = {}

        if bvid:

            params["bvid"] = bvid

        elif avid:

            params["aid"] = re.sub(r'[^0-9]', '', avid)

        else:

            raise HTTPException(status_code=400, detail="无法识别视频ID")



        api_url = "https://api.bilibili.com/x/web-interface/view"

        headers = build_bilibili_headers()



        async with aiohttp.ClientSession() as session:

            async with session.get(api_url, params=params, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:

                data = await resp.json()

                if data.get("code") != 0:

                    raise HTTPException(status_code=400, detail=data.get("message", "获取视频信息失败"))

                video = data.get("data", {})



        cover = video.get("pic") or video.get("cover") or ""

        if cover:

            if cover.startswith("//"):

                cover = "https:" + cover

            elif cover.startswith("http://"):

                cover = "https://" + cover[len("http://"):]



        return {

            "status": "success",

            "link": final_url,

            "bvid": video.get("bvid") or bvid,

            "aid": video.get("aid") or avid,

            "title": video.get("title"),

            "desc": video.get("desc"),

            "cover": cover,

            "duration": video.get("duration"),

            "pubdate": video.get("pubdate"),

            "tname": video.get("tname"),

            "owner": video.get("owner", {}),

            "stat": video.get("stat", {}),

        }

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(status_code=500, detail=f"获取视频信息失败: {str(e)}")

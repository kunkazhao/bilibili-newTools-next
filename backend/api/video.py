import logging
from fastapi import APIRouter

router = APIRouter()

try:
    import core as core
except Exception:
    from backend import core as core

globals().update({k: v for k, v in core.__dict__.items() if not k.startswith("_")})

logger = logging.getLogger(__name__)

@router.get("/api/rembg/init")

async def init_rembg_model():

    """初始化 RMBG 模型"""

    global rembg_session, rembg_loading, rembg_progress, rembg_error, rembg_device, rembg_transform, rembg_download_total_bytes



    if rembg_model_info.get("size_mb") is None and rembg_model_info_error is None:
        asyncio.create_task(asyncio.to_thread(ensure_rembg_model_info))

    if rembg_model_info.get("size_mb") is None:
        rembg_model_info["size_mb"] = 844
        rembg_model_info["size_bytes"] = 844 * 1024 * 1024
        if rembg_download_total_bytes is None:
            rembg_download_total_bytes = rembg_model_info["size_bytes"]

    if rembg_session is not None:

        return {"status": "ready", "progress": 100, "model": rembg_model_info, "token_configured": rembg_token_configured(), "downloaded_bytes": rembg_downloaded_bytes, "total_bytes": rembg_download_total_bytes}



    if rembg_loading:

        return {"status": "loading", "progress": rembg_progress, "model": rembg_model_info, "token_configured": rembg_token_configured(), "downloaded_bytes": rembg_downloaded_bytes, "total_bytes": rembg_download_total_bytes}



    rembg_loading = True

    rembg_progress = 0

    rembg_error = None



    def load_model():

        global rembg_session, rembg_loading, rembg_progress, rembg_error, rembg_device, rembg_transform, rembg_downloaded_bytes, rembg_download_total_bytes

        try:

            device = "cuda" if torch.cuda.is_available() else "cpu"
            rembg_device = device
            torch.set_float32_matmul_precision("high")

            token = os.getenv("HUGGINGFACE_HUB_TOKEN") or os.getenv("HF_TOKEN")
            model_kwargs = {"trust_remote_code": True}
            if token:
                model_kwargs["token"] = token

            ensure_rembg_model_info()
            rembg_reset_download()
            snapshot_path = None
            hf_endpoint = get_hf_endpoint()
            if hf_endpoint:
                os.environ["HF_ENDPOINT"] = hf_endpoint
            if snapshot_download and rembg_allow_patterns:
                snapshot_path = snapshot_download(
                    rembg_model_id,
                    allow_patterns=rembg_allow_patterns,
                    resume_download=True,
                    token=token,
                    endpoint=hf_endpoint,
                    tqdm_class=RembgTqdm if tqdm_auto else None
                )

            if snapshot_path:
                model = AutoModelForImageSegmentation.from_pretrained(
                    snapshot_path,
                    trust_remote_code=True,
                    local_files_only=True
                )
            else:
                model = AutoModelForImageSegmentation.from_pretrained(rembg_model_id, **model_kwargs)
            model.to(device)
            model.eval()

            if rembg_download_total_bytes:
                with rembg_download_lock:
                    rembg_downloaded_bytes = rembg_download_total_bytes

            rembg_transform = transforms.Compose([
                transforms.Resize((1024, 1024)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ])

            rembg_session = model
            rembg_progress = 100
            rembg_loading = False

        except Exception as e:

            rembg_error = str(e)
            rembg_loading = False



    # 后台加载

    asyncio.create_task(asyncio.to_thread(load_model))



    return {"status": "loading", "progress": 0, "model": rembg_model_info, "token_configured": rembg_token_configured(), "downloaded_bytes": rembg_downloaded_bytes, "total_bytes": rembg_download_total_bytes}

@router.get("/api/rembg/progress")

async def get_rembg_progress():

    """获取 RMBG 模型加载进度"""

    global rembg_session, rembg_loading, rembg_progress, rembg_error, rembg_downloaded_bytes, rembg_download_total_bytes



    if rembg_model_info.get("size_mb") is None and rembg_model_info_error is None:
        asyncio.create_task(asyncio.to_thread(ensure_rembg_model_info))

    if rembg_session is not None:

        return {"status": "ready", "progress": 100, "model": rembg_model_info, "token_configured": rembg_token_configured(), "downloaded_bytes": rembg_downloaded_bytes, "total_bytes": rembg_download_total_bytes}

    if rembg_loading:

        return {"status": "loading", "progress": rembg_progress, "model": rembg_model_info, "token_configured": rembg_token_configured(), "downloaded_bytes": rembg_downloaded_bytes, "total_bytes": rembg_download_total_bytes}

    if rembg_error:
        return {"status": "error", "progress": 0, "detail": rembg_error, "model": rembg_model_info, "token_configured": rembg_token_configured(), "downloaded_bytes": rembg_downloaded_bytes, "total_bytes": rembg_download_total_bytes}

    return {"status": "not_started", "progress": 0, "model": rembg_model_info, "token_configured": rembg_token_configured(), "downloaded_bytes": rembg_downloaded_bytes, "total_bytes": rembg_download_total_bytes}

@router.post("/api/video/download")

async def download_video(url: str = Form(...)):

    """下载 B站视频（最低清晰度）"""

    video_id = None



    # 尝试从 URL 提取视频 ID

    patterns = [

        r'bilibili\.com/video/([a-zA-Z0-9]+)',

        r'b23\.tv/([a-zA-Z0-9]+)',

        r'BV([a-zA-Z0-9]+)'

    ]

    for pattern in patterns:

        match = re.search(pattern, url)

        if match:

            video_id = match.group(1)

            break



    if not video_id:

        raise HTTPException(status_code=400, detail="无法识别视频链接")



    safe_id = sanitize_filename(video_id)

    output_path = VIDEO_DIR / f"{safe_id}.mp4"



    # 检查是否已下载

    if output_path.exists():

        return {

            "status": "already_exists",

            "video_id": video_id,

            "path": str(output_path),

            "filename": f"{safe_id}.mp4"

        }



    logger = YTDLPLogger()



    ydl_opts = {

        'format': 'worst[ext=mp4]/worst',  # 最低清晰度

        'outtmpl': str(VIDEO_DIR / f"{safe_id}.%(ext)s"),

        'quiet': True,

        'no_warnings': True,

        'logger': logger,

    }



    try:

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:

            await asyncio.to_thread(ydl.download, [url])



        return {

            "status": "success",

            "video_id": video_id,

            "path": str(output_path),

            "filename": f"{safe_id}.mp4"

        }

    except Exception as e:

        raise HTTPException(status_code=500, detail=f"下载失败: {str(e)}")

@router.post("/api/video/subtitle")

async def get_subtitle(

    url: str = Form(...),

    page: int = Form(1)

):

    """获取视频字幕"""

    final_url, bvid, avid, page_in_url = await extract_video_identity(url)

    video_id = bvid or avid

    if not video_id:

        raise HTTPException(status_code=400, detail="无法识别视频链接")



    safe_id = sanitize_filename(video_id)

    page = max(1, page or page_in_url or 1)

    cached = load_cached_subtitle(video_id, page)

    if cached:

        logger.info(f"[字幕缓存] 命中 {video_id} P{page}")

        return {

            "status": "success",

            "video_id": video_id,

            "subtitle": cached

        }

    headers = build_bilibili_headers({"Referer": url})



    # 优先使用官方接口

    official_subtitle = await fetch_subtitle_from_official_api(final_url, bvid=bvid, page=page, avid=avid)

    if official_subtitle:

        save_subtitle_cache(video_id, page, official_subtitle)

        return {

            "status": "success",

            "video_id": video_id,

            "subtitle": official_subtitle

        }

    safe_base = f'{safe_id}_p{page}'

    ydl_opts = {

        'skip_download': True,

        'writesubtitles': True,

        'writeautomaticsub': True,

        'subtitlesformat': 'json',

        'quiet': True,

        'no_warnings': True,

        'outtmpl': str(SUBTITLE_DIR / safe_base),

        'http_headers': headers,

    }

    cookie_path = ensure_bilibili_cookie_file()

    if cookie_path:

        ydl_opts['cookiefile'] = cookie_path



    try:

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:

            info = await asyncio.to_thread(ydl.extract_info, final_url, download=False)



            # 检查是否有字幕

            subtitles = info.get('subtitles', {})

            automatic_captions = info.get('automatic_captions', {})



            subtitle_data = None



            # 优先使用人工字幕

            for lang in ['zh-Hans', 'zh-Hant', 'zh', 'zh-CN']:

                if lang in subtitles:

                    subtitle_data = subtitles[lang]

                    break

                if lang in automatic_captions:

                    subtitle_data = automatic_captions[lang]

                    break



            # 如果没有找到，使用第一个可用字幕

            if not subtitle_data:

                all_subs = list(subtitles.values()) or list(automatic_captions.values())

                if all_subs:

                    subtitle_data = all_subs[0]



            if not subtitle_data or not isinstance(subtitle_data, dict):

                # 尝试直接下载字幕文件

                ydl_opts['subtitleslangs'] = ['zh-Hans', 'zh', 'zh-CN']

                ydl_opts['writeautomaticsub'] = True

                with yt_dlp.YoutubeDL(ydl_opts) as ydl2:

                    await asyncio.to_thread(ydl2.download, [final_url])



                # 读取下载的字幕文件

                subtitle_file = SUBTITLE_DIR / f'{safe_base}.zh-Hans.json'

                if not subtitle_file.exists():

                    subtitle_file = SUBTITLE_DIR / f'{safe_base}.zh.json'



                if subtitle_file.exists():

                    async with aiofiles.open(subtitle_file, 'r', encoding='utf-8') as f:

                        subtitle_data = json.loads(await f.read())

                else:

                    subtitle_data = None

            else:

                # 下载字幕数据

                subtitle_url = subtitle_data.get('url')

                if subtitle_url:

                    async with aiohttp.ClientSession() as session:

                        async with session.get(subtitle_url, headers=headers) as resp:

                            if resp.status == 200:

                                subtitle_data = await resp.json(content_type=None)

                            else:

                                subtitle_data = None



            if not subtitle_data:

                raise HTTPException(status_code=404, detail="该视频没有可用字幕")



            save_subtitle_cache(video_id, page, subtitle_data)

            return {

                "status": "success",

                "video_id": video_id,

                "subtitle": subtitle_data

            }



    except Exception as e:

        logger.info(f"[字幕] yt-dlp 获取失败，尝试官方接口: {e}")

        fallback_subtitle = await fetch_subtitle_from_official_api(final_url, bvid=bvid, page=page, avid=avid)

        if fallback_subtitle:

            save_subtitle_cache(video_id, page, fallback_subtitle)

            return {

                "status": "success",

                "video_id": video_id,

                "subtitle": fallback_subtitle

            }

        raise HTTPException(status_code=500, detail=f"获取字幕失败: {str(e)}")

@router.post("/api/subtitle/segment")
async def segment_subtitle(request: dict):
    """使用 DeepSeek 对字幕进行语义分段"""
    try:
        events = request.get('events', [])
        if not events:
            raise HTTPException(status_code=400, detail="字幕数据格式错误")

        text_parts = []
        for event in events:
            content = (event.get('content') or '').strip()
            if content:
                text_parts.append(content)

        raw_text = "\n".join(text_parts).strip()
        if not raw_text:
            raise HTTPException(status_code=400, detail="字幕内容为空")

        trimmed_text = raw_text[:10000]
        instruction = """【你是一位资深的文案排版助手。我会给你一段没有标点的视频字幕提取文案，请按以下要求处理：

添加标点： 为文案补充正确的标点符号，使逻辑清晰。

禁止修改： 严禁修改、增加或删除原有的任何文字词汇，保持原汁原味。

格式限制： 全文禁止使用双引号（""）。

商品分段： 识别文案中的不同商品或主题，并在每个商品介绍之间进行分段。

只输出排版后的文案，不要包含任何多余的开场白或解释。】"""

        prompt = f"""{instruction}\n\n\n\n文案内容：\n\n{trimmed_text}\n\n\n\n请严格按照要求输出排版后的文案。"""

        if not DEEPSEEK_API_KEY or not deepseek_client:
            raise HTTPException(status_code=500, detail="未配置 DeepSeek API 密钥")

        response = await asyncio.to_thread(
            deepseek_client.chat.completions.create,
            model=DEEPSEEK_MODEL or "deepseek-chat",
            messages=[
                {
                    "role": "system",
                    "content": "你是电商文案排版助手，只能在不改动原始词汇的前提下添加标点与分段。",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )

        choices = response.choices or []
        if not choices:
            raise HTTPException(status_code=500, detail="AI 未返回结果")

        def extract_choice_content(choice: Any) -> str:
            if isinstance(choice, dict):
                message = choice.get("message") or {}
                if isinstance(message, dict):
                    return message.get("content", "")
                return getattr(message, "content", "")
            message = getattr(choice, "message", None)
            if isinstance(message, dict):
                return message.get("content", "")
            return getattr(message, "content", "")

        content = extract_choice_content(choices[0])
        return {"status": "ok", "text": content}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

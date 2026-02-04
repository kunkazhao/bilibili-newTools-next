"""

B站电商创作工作台 - 后端服务

FastAPI + Python

"""



import asyncio

import base64

import io

import json

import os

import re

import time

import hashlib
import threading

from datetime import datetime, timezone, date, timedelta

from decimal import Decimal, InvalidOperation

from pathlib import Path

from typing import List, Optional, Dict, Any, Tuple, Set, Literal, Callable, Awaitable

from urllib.parse import urlencode, urlparse, parse_qs, quote

from zoneinfo import ZoneInfo



import aiohttp

import aiofiles

import httpx

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from playwright.async_api import async_playwright

from dashscope import MultiModalConversation, Generation

from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Request

from fastapi.responses import FileResponse, JSONResponse

from fastapi.middleware.cors import CORSMiddleware

from openai import OpenAI

from PIL import Image, ImageFilter, ImageOps

import yt_dlp

import torch
from torchvision import transforms
from transformers import AutoModelForImageSegmentation
try:
    from huggingface_hub import HfApi, snapshot_download
    from tqdm.auto import tqdm as tqdm_auto
except Exception:
    HfApi = None
    snapshot_download = None
    tqdm_auto = None

from pypinyin import lazy_pinyin, Style

from pydantic import BaseModel, Field, validator



# 加载环境变量

load_dotenv()


def get_hf_endpoint() -> Optional[str]:
    return os.getenv("HF_ENDPOINT") or os.getenv("HF_HUB_ENDPOINT")



# 代理绕过配置：确保访问 B 站时不走系统代理

NO_PROXY_DEFAULTS = {'bilibili.com', '.bilibili.com', 'api.bilibili.com', 'b23.tv'}

env_no_proxy = os.getenv('NO_PROXY', '')

hosts = {host.strip() for host in env_no_proxy.split(',') if host.strip()}

hosts.update(NO_PROXY_DEFAULTS)

merged_no_proxy = ','.join(sorted(hosts))

os.environ['NO_PROXY'] = merged_no_proxy

os.environ['no_proxy'] = merged_no_proxy



# 创建必要的目录

BASE_DIR = Path(__file__).parent.parent
LOCAL_IMAGE_TEMPLATE_DIR = BASE_DIR / "templates" / "image-templates"

IS_VERCEL = bool(os.getenv("VERCEL")) or bool(os.getenv("VERCEL_ENV"))



# 简易内存缓存（用于首屏接口加速，短 TTL）

CACHE_TTL_SECONDS = 2.0
SOURCING_CATEGORY_COUNT_TTL_SECONDS = 60.0
BLUE_LINK_MAP_CACHE_TTL_SECONDS = 10.0

BLUE_LINK_MAP_CACHE: Dict[str, Any] = {"timestamp": 0.0, "data": None}
SOURCING_CATEGORY_COUNT_CACHE: Dict[str, Any] = {"timestamp": 0.0, "data": None}

SOURCING_ITEMS_CACHE: Dict[Tuple[str, str, int, int, str], Dict[str, Any]] = {}

SOURCING_ITEMS_CACHE_LIMIT = 32



if IS_VERCEL:

    # Vercel Serverless 文件系统只允许写入 /tmp，命名空间下以免冲突

    STORAGE_ROOT = Path(os.getenv("TMPDIR", "/tmp")) / "bilibili-new-tools"

else:

    STORAGE_ROOT = BASE_DIR / "downloads"



DOWNLOAD_DIR = STORAGE_ROOT

VIDEO_DIR = DOWNLOAD_DIR / "videos"

SUBTITLE_DIR = DOWNLOAD_DIR / "subtitles"

COOKIE_DIR = DOWNLOAD_DIR / "cookies"

COOKIE_FILE = COOKIE_DIR / "bilibili_cookies.txt"

SUBTITLE_CACHE_VERSION = 2



for dir_path in [DOWNLOAD_DIR, VIDEO_DIR, SUBTITLE_DIR, COOKIE_DIR]:

    dir_path.mkdir(parents=True, exist_ok=True)



# API 密钥

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")

DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY")

JD_SCENE_ID = os.getenv("JD_SCENE_ID")

JD_ELITE_ID = os.getenv("JD_ELITE_ID")

JD_COOKIE = os.getenv("JD_COOKIE", "")



# B站 Cookie

BILIBILI_COOKIE = os.getenv("BILIBILI_COOKIE", "")



# 淘宝 Cookie

TAOBAO_COOKIE = os.getenv("TAOBAO_COOKIE", "")
TAOBAO_APP_KEY = os.getenv("TAOBAO_APP_KEY")
TAOBAO_APP_SECRET = os.getenv("TAOBAO_APP_SECRET")
TAOBAO_SESSION = os.getenv("TAOBAO_SESSION")
TAOBAO_ADZONE_ID = os.getenv("TAOBAO_ADZONE_ID")

# 知乎 Cookie
ZHIHU_COOKIE = os.getenv("ZHIHU_COOKIE", "")
ZHIHU_UA = os.getenv(
    "ZHIHU_UA",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36",
)
ZHIHU_TIMEZONE = ZoneInfo("Asia/Shanghai")



SUPABASE_URL = os.getenv("SUPABASE_URL")

SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")



FEISHU_APP_ID = os.getenv("FEISHU_APP_ID")

FEISHU_APP_SECRET = os.getenv("FEISHU_APP_SECRET")

FEISHU_API_BASE = "https://open.feishu.cn/open-apis"



feishu_http_client: Optional[httpx.AsyncClient] = None

feishu_token_cache = {"token": None, "expires_at": 0.0}



# 初始化 DeepSeek 客户端（允许无密钥启动）

deepseek_client: Optional[OpenAI] = None

if DEEPSEEK_API_KEY:

    deepseek_client = OpenAI(

        api_key=DEEPSEEK_API_KEY,

        base_url=DEEPSEEK_BASE_URL

    )



# 初始化 RMBG 模型（延迟加载）

rembg_session = None

rembg_loading = False

rembg_progress = 0

rembg_error: Optional[str] = None

rembg_device: Optional[str] = None

rembg_transform: Optional[transforms.Compose] = None

rembg_to_pil = transforms.ToPILImage()
rembg_model_id = "briaai/RMBG-2.0"
rembg_model_info: Dict[str, Any] = {"name": "BRIA RMBG-2.0", "size_mb": None}
rembg_model_info_error: Optional[str] = None
rembg_weight_filename: Optional[str] = None
rembg_allow_patterns: Optional[List[str]] = None
rembg_download_total_bytes: Optional[int] = None
rembg_downloaded_bytes = 0
rembg_download_lock = threading.Lock()

cookie_file_initialized = False



WBI_KEY_CACHE: Dict[str, str] = {}

WBI_KEY_TIMESTAMP = 0

MIXIN_KEY_ENC_TAB = [

    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,

    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,

    37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,

    22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52

]

WBI_FILTER_CHARS = set("!'()*")



app = FastAPI(title="B站电商创作工作台 API")



PROMPT_TEMPLATE_DEFAULTS = {

    "title": "你是电商标题策划，请基于选品信息生成 5 条短标题，突出卖点与价格优势，避免夸张与重复。",

    "intro": "你是电商视频文案助手，请基于选品信息生成一段视频简介，信息完整、结构清晰，控制在 120 字以内。",

    "vote": "你是电商投票策划，请基于选品信息生成投票文案，包含简短背景、候选项要点与引导语。",

    "image": "你是电商视觉策划，结合选品参数生成商品图的文案与标题。",

    "comment_reply": "你是电商评论运营助手，请基于选品信息生成 {{count}} 组评论和回复，语气可信、互动自然，包含购买引导。{{prompt}}输出格式：\n评论：...\n回复：..."

}





supabase_client: Optional["SupabaseClient"] = None

zhihu_scheduler: Optional[AsyncIOScheduler] = None
zhihu_playwright = None
zhihu_browser = None




class SupabaseError(Exception):

    def __init__(self, status_code: int, message: str):

        super().__init__(message)

        self.status_code = status_code

        self.message = message





class SupabaseClient:

    def __init__(self, base_url: str, service_key: str):

        if not base_url or not service_key:

            raise ValueError("Supabase base URL and service key are required")

        self.base_url = base_url.rstrip("/")

        self.service_key = service_key

        self.rest_url = f"{self.base_url}/rest/v1"

        self.rpc_url = f"{self.base_url}/rest/v1/rpc"

        self._client = httpx.AsyncClient(timeout=30.0)



    async def close(self) -> None:

        await self._client.aclose()



    async def request(

        self,

        method: str,

        path: str,

        *,

        params: Optional[Dict[str, Any]] = None,

        json_payload: Optional[Any] = None,

        prefer: Optional[str] = None,

        is_rpc: bool = False

    ) -> Any:

        base_url = self.rpc_url if is_rpc else self.rest_url

        url = f"{base_url}/{path.lstrip('/')}"

        headers = {

            "apikey": self.service_key,

            "Authorization": f"Bearer {self.service_key}",

            "Accept": "application/json",

        }

        if json_payload is not None:

            headers["Content-Type"] = "application/json"

        if prefer:

            headers["Prefer"] = prefer

        try:

            response = await self._client.request(

                method,

                url,

                params=params,

                json=json_payload,

                headers=headers

            )

        except httpx.RequestError as exc:

            raise SupabaseError(0, f"Supabase network error: {exc}") from exc



        if response.status_code >= 400:

            try:

                detail = response.json()

                if isinstance(detail, dict):

                    message = detail.get("message") or detail.get("error") or detail

                else:

                    message = detail

            except ValueError:

                message = response.text or "Unexpected Supabase error"

            raise SupabaseError(response.status_code, str(message))



        if response.status_code == 204 or not response.content:

            return None

        try:

            return response.json()

        except ValueError:

            return None



    async def select(self, table: str, params: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:

        query = dict(params or {})

        query.setdefault("select", "*")

        result = await self.request("GET", table, params=query)

        return result or []



    async def insert(self, table: str, payload: Any) -> List[Dict[str, Any]]:

        return await self.request(

            "POST",

            table,

            params={"select": "*"},

            json_payload=payload,

            prefer="return=representation"

        ) or []



    async def upsert(

        self,

        table: str,

        payload: Any,

        *,

        on_conflict: Optional[str] = None

    ) -> List[Dict[str, Any]]:

        params = {"select": "*"}

        if on_conflict:

            params["on_conflict"] = on_conflict

        return await self.request(

            "POST",

            table,

            params=params,

            json_payload=payload,

            prefer="return=representation,resolution=merge-duplicates"

        ) or []



    async def update(self, table: str, payload: Dict[str, Any], filters: Dict[str, Any]) -> List[Dict[str, Any]]:

        query = dict(filters or {})

        query.setdefault("select", "*")

        return await self.request(

            "PATCH",

            table,

            params=query,

            json_payload=payload,

            prefer="return=representation"

        ) or []



    async def delete(self, table: str, filters: Dict[str, Any]) -> None:

        await self.request("DELETE", table, params=filters)



    async def rpc(self, function_name: str, params: Optional[Dict[str, Any]] = None) -> Any:

        return await self.request(

            "POST",

            function_name,

            json_payload=params or {},

            is_rpc=True

        )





def ensure_supabase() -> SupabaseClient:

    if not supabase_client:

        raise HTTPException(status_code=503, detail="Supabase 未配置，暂无法使用该功能")

    return supabase_client





def utc_now_iso() -> str:

    return datetime.now(timezone.utc).isoformat()


def shanghai_today() -> date:
    return datetime.now(tz=ZHIHU_TIMEZONE).date()


async def fetch_zhihu_keywords_map(client: SupabaseClient) -> Dict[str, str]:
    rows = await client.select("zhihu_keywords", params={"select": "id,name"})
    return {str(row.get("id")): row.get("name") or "" for row in rows}


def parse_cookie_header(cookie_value: str, domain: str) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    if not cookie_value:
        return items
    for part in cookie_value.split(";"):
        if "=" not in part:
            continue
        name, value = part.split("=", 1)
        name = name.strip()
        value = value.strip()
        if not name:
            continue
        items.append({"name": name, "value": value, "domain": domain, "path": "/"})
    return items


def extract_zhihu_questions(items: List[Dict[str, Any]], limit: int = 50) -> List[Dict[str, str]]:
    results: List[Dict[str, str]] = []
    seen: Set[str] = set()
    for item in items or []:
        obj = item.get("object") or {}
        if obj.get("type") != "question":
            continue
        question = obj.get("question") or {}
        qid = str(question.get("id") or "").strip()
        title = (question.get("title") or "").strip()
        if not qid or not title:
            continue
        if qid in seen:
            continue
        seen.add(qid)
        results.append({"id": qid, "title": title, "url": f"https://www.zhihu.com/question/{qid}"})
        if len(results) >= limit:
            break
    return results


async def ensure_zhihu_browser():
    global zhihu_playwright, zhihu_browser
    if zhihu_browser:
        return zhihu_browser
    zhihu_playwright = await async_playwright().start()
    zhihu_browser = await zhihu_playwright.chromium.launch(headless=True)
    return zhihu_browser


async def close_zhihu_browser():
    global zhihu_playwright, zhihu_browser
    if zhihu_browser:
        await zhihu_browser.close()
        zhihu_browser = None
    if zhihu_playwright:
        await zhihu_playwright.stop()
        zhihu_playwright = None


async def fetch_search_results_for_keyword(
    keyword: str,
    response_fetcher: Optional[Callable[[int], Awaitable[Dict[str, Any]]]] = None,
) -> List[Dict[str, Any]]:
    offsets = [0, 20, 40]
    results: List[Dict[str, Any]] = []
    if response_fetcher:
        for offset in offsets:
            try:
                payload = await response_fetcher(offset)
            except Exception:
                continue
            results.extend(payload.get("data") or [])
        return results

    browser = await ensure_zhihu_browser()
    context = await browser.new_context(user_agent=ZHIHU_UA)
    if ZHIHU_COOKIE:
        await context.add_cookies(parse_cookie_header(ZHIHU_COOKIE, ".zhihu.com"))
    page = await context.new_page()
    try:
        search_url = f"https://www.zhihu.com/search?type=content&q={quote(keyword)}"
        await page.goto(search_url, wait_until="domcontentloaded")
        for offset in offsets:
            try:
                response = await page.wait_for_response(
                    lambda r: "api/v4/search_v3" in r.url and f"offset={offset}" in r.url,
                    timeout=15000,
                )
                payload = await response.json()
                results.extend(payload.get("data") or [])
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await page.wait_for_timeout(800)
            except Exception:
                continue
    finally:
        await context.close()
    return results


async def fetch_question_stats(
    question_id: str,
    response_fetcher: Optional[Callable[[], Awaitable[Dict[str, Any]]]] = None,
) -> Optional[Dict[str, Any]]:
    if response_fetcher:
        return await response_fetcher()

    browser = await ensure_zhihu_browser()
    context = await browser.new_context(user_agent=ZHIHU_UA)
    if ZHIHU_COOKIE:
        await context.add_cookies(parse_cookie_header(ZHIHU_COOKIE, ".zhihu.com"))
    page = await context.new_page()
    try:
        url = f"https://www.zhihu.com/question/{question_id}"
        await page.goto(url, wait_until="domcontentloaded")
        resp = await page.wait_for_response(
            lambda r: f"/api/v4/questions/{question_id}" in r.url,
            timeout=15000,
        )
        return await resp.json()
    except Exception:
        return None
    finally:
        await context.close()


async def zhihu_scrape_job(
    client: Optional["SupabaseClient"] = None,
    search_fetcher: Optional[Callable[[str], Awaitable[List[Dict[str, Any]]]]] = None,
    detail_fetcher: Optional[Callable[[str], Awaitable[Optional[Dict[str, Any]]]]] = None,
    today: Optional[date] = None,
    now: Optional[str] = None,
) -> None:
    client = client or ensure_supabase()
    keywords = await client.select("zhihu_keywords", params={"order": "created_at.asc"})
    if not keywords:
        return

    today_value = today or shanghai_today()
    now_value = now or utc_now_iso()
    search_fetcher = search_fetcher or fetch_search_results_for_keyword
    detail_fetcher = detail_fetcher or fetch_question_stats

    processed_questions: Set[str] = set()

    for keyword in keywords:
        name = (keyword.get("name") or "").strip()
        keyword_id = keyword.get("id")
        if not name or not keyword_id:
            continue

        raw_items = await search_fetcher(name)
        questions = extract_zhihu_questions(raw_items, limit=50)

        for question in questions:
            qid = question.get("id")
            if not qid:
                continue

            await client.request(
                "POST",
                "zhihu_question_keywords",
                params={"on_conflict": "question_id,keyword_id"},
                json_payload={
                    "question_id": qid,
                    "keyword_id": keyword_id,
                    "first_seen_at": now_value,
                    "last_seen_at": now_value,
                },
                prefer="resolution=merge-duplicates,return=representation",
            )

            if qid in processed_questions:
                continue

            existing = await client.select("zhihu_questions", {"id": f"eq.{qid}"})
            first_keyword_id = existing[0].get("first_keyword_id") if existing else None
            payload = {
                "id": qid,
                "title": question.get("title") or "",
                "url": question.get("url") or f"https://www.zhihu.com/question/{qid}",
                "first_keyword_id": first_keyword_id or keyword_id,
                "updated_at": now_value,
                "last_seen_at": now_value,
            }
            if not existing:
                payload["created_at"] = now_value

            await client.request(
                "POST",
                "zhihu_questions",
                params={"on_conflict": "id"},
                json_payload=payload,
                prefer="resolution=merge-duplicates,return=representation",
            )

            detail = await detail_fetcher(qid)
            if not detail:
                processed_questions.add(qid)
                continue

            stat = {
                "question_id": qid,
                "stat_date": str(today_value),
                "view_count": int(detail.get("visit_count") or 0),
                "answer_count": int(detail.get("answer_count") or 0),
                "fetched_at": now_value,
            }
            await client.request(
                "POST",
                "zhihu_question_stats",
                params={"on_conflict": "question_id,stat_date"},
                json_payload=stat,
                prefer="resolution=merge-duplicates,return=representation",
            )
            processed_questions.add(qid)

    cutoff = today_value - timedelta(days=15)
    await client.delete("zhihu_question_stats", {"stat_date": f"lt.{cutoff}"})


def init_zhihu_scheduler() -> None:
    global zhihu_scheduler
    if zhihu_scheduler:
        return
    zhihu_scheduler = AsyncIOScheduler(timezone=ZHIHU_TIMEZONE)
    zhihu_scheduler.add_job(zhihu_scrape_job, CronTrigger(hour=5, minute=0))
    zhihu_scheduler.start()





def decimal_to_float(value: Any) -> Optional[float]:

    if value is None:

        return None

    if isinstance(value, (int, float)):

        return float(value)

    try:

        return float(Decimal(str(value)))

    except (InvalidOperation, ValueError, TypeError):

        return None





def decimal_str(value: Optional[Any]) -> Optional[str]:

    if value is None or value == "":

        return None

    try:

        dec = Decimal(str(value))

    except (InvalidOperation, ValueError, TypeError):

        return None

    return format(dec.normalize(), "f")





def normalize_spec_payload(spec: Optional[Dict[str, Any]]) -> Dict[str, str]:

    if not isinstance(spec, dict):

        return {}

    normalized: Dict[str, str] = {}

    for key, raw_value in spec.items():

        if key is None:

            continue

        key_str = str(key).strip()

        if not key_str:

            continue

        if raw_value is None:

            continue

        normalized[key_str] = str(raw_value).strip()

    return normalized


def merge_spec_payload(payload_spec: Any, raw_spec: Any) -> Optional[Dict[str, Any]]:

    spec: Optional[Dict[str, Any]] = None

    if isinstance(payload_spec, dict):
        spec = dict(payload_spec)
    elif isinstance(raw_spec, dict):
        spec = dict(raw_spec)

    if spec is None:
        return None

    if isinstance(raw_spec, dict):
        for key, value in raw_spec.items():
            if key not in spec:
                spec[key] = value

    if "_s_30" not in spec:
        for alt_key in ("_sales_30", "_sales30", "sales_30", "sales30", "sales30Days", "inOrderCount30Days"):
            if alt_key in spec:
                spec["_s_30"] = spec.get(alt_key)
                break

    for alt_key in ("_sales_30", "_sales30", "sales_30", "sales30", "sales30Days", "inOrderCount30Days"):
        if alt_key in spec:
            spec.pop(alt_key, None)

    return spec




def derive_uid_prefix(name: Optional[str]) -> str:

    if not name:

        return "SP"

    try:

        letters = "".join(lazy_pinyin(name, style=Style.FIRST_LETTER))

    except Exception:

        letters = ""

    letters = "".join(ch for ch in letters if ch.isalpha())

    if not letters:

        letters = "".join(ch for ch in name if ch.isalpha())

    letters = letters.upper()

    if len(letters) >= 2:

        return letters[:2]

    if letters:

        return (letters + "X")[:2]

    return "SP"





@app.on_event("startup")

async def init_supabase_client() -> None:

    global supabase_client

    if SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:

        supabase_client = SupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        print("[Supabase] 已启用")

    else:

        print("[Supabase] 未配置，相关模块将退化为本地模式")

    init_zhihu_scheduler()





@app.on_event("shutdown")

async def shutdown_supabase_client() -> None:

    if supabase_client:

        await supabase_client.close()

    global feishu_http_client

    if feishu_http_client:

        await feishu_http_client.aclose()

        feishu_http_client = None

    if zhihu_scheduler:
        zhihu_scheduler.shutdown(wait=False)
    await close_zhihu_browser()





def build_bilibili_headers(extra: Optional[dict] = None) -> dict:

    headers = {

        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

        "Referer": "https://www.bilibili.com/",

        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",

        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",

        "Cache-Control": "no-cache",

        "Pragma": "no-cache",

        "Sec-Fetch-Dest": "document",

        "Sec-Fetch-Mode": "navigate",

        "Sec-Fetch-Site": "same-origin",

        # 限制编码为 gzip/deflate，避免 aiohttp 缺少 brotli 支持时报错

        "Accept-Encoding": "gzip, deflate",

        "Origin": "https://www.bilibili.com",

        "Connection": "keep-alive",

        "Upgrade-Insecure-Requests": "1",

    }

    if BILIBILI_COOKIE:

        headers["Cookie"] = BILIBILI_COOKIE

    if extra:

        headers.update(extra)

    return headers


def extract_mid_from_homepage_link(link: Optional[str]) -> str:
    if not link:
        return ""
    trimmed = str(link).strip()
    if not trimmed:
        return ""
    if trimmed.isdigit():
        return trimmed
    match = re.search(r"space\.bilibili\.com/(\d+)", trimmed)
    if match:
        return match.group(1)
    return ""


def parse_bili_count(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip()
    if not text:
        return None
    multiplier = 1
    if text.endswith("万"):
        multiplier = 10000
        text = text[:-1]
    elif text.endswith("亿"):
        multiplier = 100000000
        text = text[:-1]
    try:
        return int(float(text) * multiplier)
    except ValueError:
        return None


def pick_first_value(*values: Any) -> Any:
    for value in values:
        if value is None:
            continue
        if isinstance(value, str) and not value.strip():
            continue
        return value
    return None


def parse_duration_to_seconds(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return int(value)
    text = str(value).strip()
    if not text:
        return None
    if ":" not in text:
        try:
            return int(float(text))
        except ValueError:
            return None
    parts = [p for p in text.split(":") if p != ""]
    if not parts:
        return None
    try:
        numbers = [int(part) for part in parts]
    except ValueError:
        return None
    if len(numbers) == 3:
        return numbers[0] * 3600 + numbers[1] * 60 + numbers[2]
    if len(numbers) == 2:
        return numbers[0] * 60 + numbers[1]
    return numbers[0]





def _extract_wbi_key(url: str) -> str:

    if not url:

        return ""

    filename = url.split('/')[-1]

    return filename.split('.')[0]





async def fetch_wbi_keys(force: bool = False) -> Optional[Dict[str, str]]:

    """获取 WBI 加密所需的 key，必要时自动刷新。"""

    global WBI_KEY_CACHE, WBI_KEY_TIMESTAMP

    now = time.time()

    if not force and WBI_KEY_CACHE and now - WBI_KEY_TIMESTAMP < 3600:

        return WBI_KEY_CACHE



    headers = build_bilibili_headers({"Referer": "https://www.bilibili.com/"})

    try:

        async with aiohttp.ClientSession() as session:

            async with session.get(

                "https://api.bilibili.com/x/web-interface/nav",

                headers=headers,

                timeout=aiohttp.ClientTimeout(total=10)

            ) as resp:

                data = await resp.json()

                wbi_img = data.get("data", {}).get("wbi_img", {})

                img_key = _extract_wbi_key(wbi_img.get("img_url", ""))

                sub_key = _extract_wbi_key(wbi_img.get("sub_url", ""))

                if img_key and sub_key:

                    WBI_KEY_CACHE = {"img_key": img_key, "sub_key": sub_key}

                    WBI_KEY_TIMESTAMP = now

                    return WBI_KEY_CACHE

    except Exception as e:

        print(f"[WBI] 获取密钥失败: {e}")



    if not force and WBI_KEY_CACHE:

        return WBI_KEY_CACHE

    return None





def build_mixin_key(img_key: str, sub_key: str) -> str:

    source = (img_key or "") + (sub_key or "")

    if not source:

        return ""

    return ''.join(source[i] for i in MIXIN_KEY_ENC_TAB if i < len(source))[:32]





def encode_wbi_params(params: Dict[str, str], img_key: str, sub_key: str) -> Dict[str, str]:

    mixin_key = build_mixin_key(img_key, sub_key)

    if not mixin_key:

        return params

    filtered = {}

    for key, value in params.items():

        if value is None or value == "":

            continue

        str_value = ''.join(ch for ch in str(value) if ch not in WBI_FILTER_CHARS)

        filtered[key] = str_value

    sorted_items = dict(sorted(filtered.items()))

    wts = str(int(time.time()))

    sorted_items["wts"] = wts

    query = urlencode(sorted_items)

    sorted_items["w_rid"] = hashlib.md5((query + mixin_key).encode('utf-8')).hexdigest()

    return sorted_items





async def fetch_wbi_subtitle_list(

    headers: Dict[str, str],

    bvid: Optional[str],

    aid: Optional[str],

    cid: Optional[int]

):

    keys = await fetch_wbi_keys()

    if not keys:

        return []



    params: Dict[str, str] = {

        "cid": str(cid or ""),

        "qn": "80",

        "fnver": "0",

        "fnval": "4048",

        "fourk": "1"

    }

    if aid:

        params["aid"] = re.sub(r'[^0-9]', '', str(aid))

    elif bvid:

        params["bvid"] = bvid



    for attempt in range(2):

        signed_params = encode_wbi_params(params, keys.get("img_key", ""), keys.get("sub_key", ""))

        try:

            async with aiohttp.ClientSession() as session:

                async with session.get(

                    "https://api.bilibili.com/x/player/wbi/v2",

                    params=signed_params,

                    headers=headers,

                    timeout=aiohttp.ClientTimeout(total=10)

                ) as resp:

                    data = await resp.json()

                    if data.get("code") == 0:

                        return data.get("data", {}).get("subtitle", {}).get("subtitles", []) or []

                    if data.get("code") in (-403, -412):

                        keys = await fetch_wbi_keys(force=True)

                        continue

                    return []

        except Exception as e:

            print(f"[WBI] 调用 subtitle 接口失败: {e}")

            break

    return []


def build_bilibili_video_link(bvid: Optional[str]) -> str:
    if not bvid:
        return ""
    trimmed = str(bvid).strip()
    if not trimmed:
        return ""
    if trimmed.lower().startswith("bv"):
        return f"https://www.bilibili.com/video/{trimmed}"
    return f"https://www.bilibili.com/video/BV{trimmed}"


def build_account_video_payload(
    account_id: str,
    item: Dict[str, Any],
    stat: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    if not isinstance(item, dict):
        return None
    bvid = item.get("bvid") or item.get("bvid_str") or ""
    bvid = str(bvid).strip()
    if not bvid:
        return None
    title = item.get("title") or ""
    cover = item.get("pic") or item.get("cover") or ""
    author = item.get("author") or item.get("owner", {}).get("name") or ""
    duration = parse_duration_to_seconds(item.get("length") or item.get("duration"))
    pub_ts = item.get("created") or item.get("pubdate")
    pub_time = None
    if pub_ts:
        try:
            pub_time = datetime.fromtimestamp(int(pub_ts), tz=timezone.utc).isoformat()
        except Exception:
            pub_time = None
    stat_src = stat if isinstance(stat, dict) else {}
    stats = {
        "view": parse_bili_count(
            pick_first_value(stat_src.get("view"), item.get("play"), item.get("view"))
        ),
        "like": parse_bili_count(pick_first_value(stat_src.get("like"), item.get("like"))),
        "favorite": parse_bili_count(
            pick_first_value(
                stat_src.get("favorite"),
                stat_src.get("fav"),
                stat_src.get("favorites"),
                item.get("favorite"),
                item.get("favorites"),
            )
        ),
        "reply": parse_bili_count(
            pick_first_value(stat_src.get("reply"), item.get("comment"), item.get("reply"))
        ),
        "danmaku": parse_bili_count(
            pick_first_value(
                stat_src.get("danmaku"),
                stat_src.get("video_review"),
                item.get("video_review"),
                item.get("danmaku"),
            )
        ),
    }
    if all(value is None for value in stats.values()):
        stats = None
    return {
        "account_id": account_id,
        "bvid": bvid,
        "title": title,
        "link": build_bilibili_video_link(bvid),
        "cover": cover,
        "author": author,
        "duration": duration,
        "pub_time": pub_time,
        "stats": stats,
        "payload": item,
        "updated_at": utc_now_iso(),
    }


async def fetch_account_videos_from_bili(
    mid: str,
    page: int = 1,
    page_size: int = 20,
    session: Optional[aiohttp.ClientSession] = None,
) -> List[Dict[str, Any]]:
    keys = await fetch_wbi_keys()
    if not keys:
        raise HTTPException(status_code=500, detail="无法获取 B 站 WBI 密钥")
    url = "https://api.bilibili.com/x/space/wbi/arc/search"
    params: Dict[str, str] = {
        "mid": str(mid),
        "pn": str(page),
        "ps": str(page_size),
        "order": "pubdate",
    }
    headers = build_bilibili_headers({"Referer": "https://www.bilibili.com/"})

    async def request(current_session: aiohttp.ClientSession) -> List[Dict[str, Any]]:
        async with current_session.get(
            url,
            headers=headers,
            params=signed_params,
            timeout=aiohttp.ClientTimeout(total=12),
        ) as resp:
            data = await resp.json()
            if data.get("code") != 0:
                message = data.get("message") or "获取账号视频失败"
                raise RuntimeError(message)
            return data.get("data", {}).get("list", {}).get("vlist", []) or []

    for attempt in range(2):
        signed_params = encode_wbi_params(params, keys.get("img_key", ""), keys.get("sub_key", ""))
        try:
            if session:
                return await request(session)
            async with aiohttp.ClientSession() as local_session:
                return await request(local_session)
        except Exception as e:
            if attempt == 0:
                keys = await fetch_wbi_keys(force=True)
                continue
            raise HTTPException(status_code=500, detail=f"获取账号视频失败: {e}")
    return []


async def fetch_account_video_stat(
    bvid: str,
    session: Optional[aiohttp.ClientSession] = None,
) -> Optional[Dict[str, Any]]:
    if not bvid:
        return None
    trimmed = str(bvid).strip()
    if not trimmed:
        return None
    headers = build_bilibili_headers({"Referer": "https://www.bilibili.com/"})
    stat_url = "https://api.bilibili.com/x/web-interface/archive/stat"
    view_url = "https://api.bilibili.com/x/web-interface/view"

    async def fetch_data(url: str) -> Optional[Dict[str, Any]]:
        for attempt in range(2):
            try:
                if session:
                    async with session.get(
                        url,
                        headers=headers,
                        params={"bvid": trimmed},
                        timeout=aiohttp.ClientTimeout(total=10),
                    ) as resp:
                        data = await resp.json()
                else:
                    async with aiohttp.ClientSession() as local_session:
                        async with local_session.get(
                            url,
                            headers=headers,
                            params={"bvid": trimmed},
                            timeout=aiohttp.ClientTimeout(total=10),
                        ) as resp:
                            data = await resp.json()
                if data.get("code") != 0:
                    return None
                return data.get("data") or None
            except Exception:
                if attempt == 0:
                    continue
                return None
        return None

    stat_data = await fetch_data(stat_url)
    if stat_data:
        return stat_data
    view_data = await fetch_data(view_url)
    if isinstance(view_data, dict):
        return view_data.get("stat") or None
    return None





def ensure_bilibili_cookie_file() -> Optional[str]:

    global cookie_file_initialized

    if not BILIBILI_COOKIE:

        return None

    needs_write = not cookie_file_initialized or not COOKIE_FILE.exists()

    if not needs_write:

        return str(COOKIE_FILE)

    lines = ["# Netscape HTTP Cookie File"]

    expires = "2147483647"

    for part in BILIBILI_COOKIE.split(';'):

        part = part.strip()

        if not part or '=' not in part:

            continue

        name, value = part.split('=', 1)

        if not name:

            continue

        domain = ".bilibili.com"

        secure = "FALSE"

        path = "/"

        lines.append(f"{domain}\tTRUE\t{path}\t{secure}\t{expires}\t{name}\t{value}")

    try:

        COOKIE_FILE.write_text("\n".join(lines), encoding="utf-8")

        cookie_file_initialized = True

        return str(COOKIE_FILE)

    except Exception as e:

        print(f"[Cookie] 写入失败: {e}")

        return None





JD_SKU_REGEX = re.compile(r'(?:(?:sku=|/)(\d{6,}))(?:\.html)?', re.IGNORECASE)

JD_IMG_REGEX = re.compile(r'(?:(?:https?:)?//img\d+\.360buyimg\.com/[A-Za-z0-9/_\-.!]+)', re.IGNORECASE)





def extract_jd_sku_from_url(url: str) -> Optional[str]:

    if not url:

        return None

    match_html = re.search(r'/(\d+)\.html', url)

    if match_html:

        return match_html.group(1)

    match = JD_SKU_REGEX.search(url)

    if match:

        return match.group(1)

    return None





def normalize_jd_image_url(url: str) -> str:

    if not url:

        return url

    cleaned = url.strip().strip('"\'')

    if not cleaned:

        return cleaned

    if cleaned.startswith('//'):

        cleaned = 'https:' + cleaned

    elif not cleaned.startswith('http'):

        cleaned = cleaned.lstrip('/')

        cleaned = f"https://img14.360buyimg.com/n0/{cleaned}"

    cleaned = re.sub(r'/s\d+x\d+/', '/n0/', cleaned)

    cleaned = re.sub(r'/n\d+/', '/n0/', cleaned)

    if '/n0/' not in cleaned and '/ads/' in cleaned:

        cleaned = cleaned.replace('/ads/', '/n0/')

    return cleaned





def extract_jd_images_from_html(html: str) -> List[str]:

    candidates: List[str] = []

    if not html:

        return candidates

    # 尝试从 imageList 数组中提取

    for block in re.findall(r'imageList\s*:\s*\[(.*?)\]', html, re.S):

        block_urls = re.findall(r'"([^"]+)"', block)

        candidates.extend(block_urls)

    if not candidates:

        for block in re.findall(r'"image"\s*:\s*\[(.*?)\]', html, re.S):

            block_urls = re.findall(r'"([^"]+)"', block)

            if any('jfs/' in url for url in block_urls):

                candidates.extend(block_urls)

    # 退回到全局匹配

    if not candidates:

        candidates.extend(JD_IMG_REGEX.findall(html))

    # 处理 regex findall returning tuples when optional group

    cleaned = []

    for item in candidates:

        if isinstance(item, tuple):

            item = ''.join(item)

        cleaned.append(item)

    # 去重并标准化

    seen = set()

    normalized = []

    for url in cleaned:

        norm = normalize_jd_image_url(url)

        if norm not in seen:

            seen.add(norm)

            normalized.append(norm)

    return normalized





def select_best_jd_image(images: List[str]) -> Optional[str]:

    if not images:

        return None

    preferred_keywords = ['whiteimage', 'n0', '800x800', '1000x1000']

    for keyword in preferred_keywords:

        for img in images:

            if keyword in img.lower():

                return img

    return images[0]





async def fetch_jd_page(url: str) -> str:

    referer = "https://item.jd.com/"

    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"

    if "item.m.jd.com" in url:

        referer = "https://item.m.jd.com/"

        user_agent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"

    headers = {

        "User-Agent": user_agent,

        "Referer": referer,

        "Accept-Language": "zh-CN,zh;q=0.9",

        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",

        "Cache-Control": "no-cache",

        "Pragma": "no-cache",

        "Connection": "keep-alive",

        "Accept-Encoding": "gzip, deflate",

    }

    if JD_COOKIE:

        headers["Cookie"] = JD_COOKIE

    async with aiohttp.ClientSession() as session:

        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:

            if resp.status != 200:

                raise HTTPException(status_code=500, detail=f"获取京东页面失败: HTTP {resp.status}")

            return await resp.text()



# CORS 配置

frontend_port = os.getenv("FRONTEND_PORT")

extra_origins = []

if frontend_port:

    extra_origins = [

        f"http://127.0.0.1:{frontend_port}",

        f"http://localhost:{frontend_port}",

    ]



app.add_middleware(

    CORSMiddleware,

    allow_origins=[

        "http://127.0.0.1:8080",

        "http://localhost:8080",

        "http://127.0.0.1:8081",

        "http://localhost:8081",

        "http://127.0.0.1:8082",

        "http://localhost:8082",

        "http://127.0.0.1:8000",

        "http://localhost:8000",

        "http://127.0.0.1:8001",

        "http://localhost:8001",

        "http://127.0.0.1:8002",

        "http://localhost:8002",

        *extra_origins,

    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)





# ==================== B站 API 代理 ====================

class BilibiliProxyRequest(BaseModel):
    url: str = Field(..., description="B? API ??")


async def handle_bilibili_proxy(url: str):
    """???? B? API??? CORS ??"""
    if not url or "bilibili.com" not in url:
        raise HTTPException(status_code=400, detail="?????B? API")

    headers = build_bilibili_headers({"Accept": "application/json"})

    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
                data = await response.json()
                # ????????? safe_print ???????
                print(f"[B???] URL: {url}")
                print(f"[B???] ??code: {data.get('code')}")
                if 'data' in data:
                    d = data['data']
                    keys = list(d.keys()) if isinstance(d, dict) else type(d)
                    print(f"[B???] data.keys: {keys}")
                    # top ? upper ???? emoji??? repr ????
                    print(f"[B???] data.top: {repr(d.get('top'))[:100]}")
                    print(f"[B???] data.upper: {repr(d.get('upper'))[:100]}")

                # ??B?API??????????????????
                bili_code = data.get('code')
                if bili_code and bili_code != 0:
                    print(f"[B???] B?API?????: {bili_code}, message: {data.get('message', '????')}")

                return JSONResponse(content=data)
        except Exception as e:
            print(f"[B???] ??: {e}")
            # ????????????????
            return JSONResponse(
                status_code=200,
                content={"code": -1, "message": f"??????: {str(e)}", "data": None}
            )


@app.get("/api/bilibili/proxy")
async def bilibili_proxy(url: str):
    """???? B? API??? CORS ???GET?"""
    return await handle_bilibili_proxy(url)


@app.post("/api/bilibili/proxy")
async def bilibili_proxy_post(payload: BilibiliProxyRequest):
    """???? B? API??? CORS ???POST?"""
    return await handle_bilibili_proxy(payload.url)

# ==================== 京东商品 API 代理 ====================



@app.post("/api/jd/product")

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





class JdImageRequest(BaseModel):

    url: str = Field(..., description="京东商品链接")





@app.post("/api/jd/main-image")

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






TAOBAO_API_BASE = "https://eco.taobao.com/router/rest"


def _taobao_timestamp() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def build_taobao_signed_params(method: str, params: Dict[str, Any]) -> Dict[str, str]:
    if not TAOBAO_APP_KEY or not TAOBAO_APP_SECRET:
        raise HTTPException(status_code=500, detail="??????? app_key/app_secret")
    payload: Dict[str, Any] = {
        "app_key": TAOBAO_APP_KEY,
        "method": method,
        "format": "json",
        "v": "2.0",
        "sign_method": "md5",
        "timestamp": _taobao_timestamp(),
    }
    if TAOBAO_SESSION:
        payload["session"] = TAOBAO_SESSION
    for key, value in (params or {}).items():
        if value is None:
            continue
        payload[key] = value
    sign_base = TAOBAO_APP_SECRET + ''.join(
        f"{k}{payload[k]}" for k in sorted(payload.keys())
    ) + TAOBAO_APP_SECRET
    payload["sign"] = hashlib.md5(sign_base.encode("utf-8")).hexdigest().upper()
    return {k: str(v) for k, v in payload.items()}


def normalize_taobao_commission_rate(value: Any) -> str:
    if value is None or value == "":
        return ""
    try:
        dec = Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return ""
    percent = dec / Decimal("100")
    if percent == percent.to_integral():
        return f"{int(percent)}%"
    formatted = f"{percent:.2f}".rstrip("0").rstrip(".")
    return f"{formatted}%"


async def taobao_api_request(method: str, params: Dict[str, Any]) -> Dict[str, Any]:
    payload = build_taobao_signed_params(method, params)
    async with aiohttp.ClientSession() as session:
        async with session.post(
            TAOBAO_API_BASE,
            data=payload,
            timeout=aiohttp.ClientTimeout(total=15),
        ) as response:
            data = await response.json(content_type=None)
            return data if isinstance(data, dict) else {}


async def taobao_click_extract(url: str) -> Dict[str, Any]:
    params: Dict[str, Any] = {"click_url": url}
    if TAOBAO_ADZONE_ID:
        params["adzone_id"] = TAOBAO_ADZONE_ID
    data = await taobao_api_request("taobao.tbk.item.click.extract", params)
    payload = data.get("tbk_item_click_extract_response", {})
    result = payload.get("data") or {}
    return {
        "itemId": result.get("item_id") or "",
        "openIid": result.get("open_iid") or "",
        "sourceLink": url,
    }


async def taobao_item_details(item_id: str) -> Dict[str, Any]:
    params: Dict[str, Any] = {"item_id": item_id}
    data = await taobao_api_request("taobao.tbk.item.details.upgrade.get", params)
    payload = data.get("tbk_item_details_upgrade_get_response", {})
    results = payload.get("results", {})
    items = results.get("n_tbk_item", []) if isinstance(results, dict) else []
    item = items[0] if items else {}
    publish = item.get("publish_info") or {}
    income = publish.get("income_info") or {}
    return {
        "title": item.get("title") or "",
        "cover": item.get("pict_url") or "",
        "price": item.get("zk_final_price") or item.get("price") or "",
        "commissionRate": normalize_taobao_commission_rate(income.get("commission_rate")),
        "sales30": item.get("volume") or "",
        "shopName": item.get("shop_title") or item.get("seller_nick") or "",
        "materialUrl": item.get("item_url") or item.get("url") or "",
    }


@app.post("/api/taobao/resolve")
async def taobao_resolve(request: dict):
    """????/????????ID"""
    url = (request or {}).get("url") or ""
    url = str(url).strip()
    if not url:
        raise HTTPException(status_code=400, detail="?? url ??")
    return await taobao_click_extract(url)


@app.post("/api/taobao/product")
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



@app.post("/api/jd/resolve")
async def jd_resolve_url(request: dict):
    """?????????????????"""
    import re

    try:
        url = request.get("url")
        if not url:
            raise HTTPException(status_code=400, detail="?? url ??")

        if "item.jd.com" in url:
            return {"resolvedUrl": url}

        print(f"[????] ????: {url[:80]}...")

        headers = build_bilibili_headers()
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, allow_redirects=True, timeout=aiohttp.ClientTimeout(total=10)) as response:
                resolved_url = str(response.url)
                print(f"[????] ??URL: {resolved_url[:80]}...")

                if len(response.history) > 0:
                    for redirect in response.history:
                        redirect_url = str(redirect.url)
                        if "item.jd.com" in redirect_url:
                            return {"resolvedUrl": redirect_url}

                if "item.jd.com" in resolved_url:
                    return {"resolvedUrl": resolved_url}

                # b23 -> union-click/jdc -> html contains hrl -> union-click/jda -> item.jd.com
                if "union-click.jd.com/jdc" in resolved_url:
                    html = await response.text()
                    match = re.search(r"var hrl='([^']+)'", html)
                    if match:
                        jda_url = match.group(1)
                        async with session.get(jda_url, headers=headers, allow_redirects=False, timeout=aiohttp.ClientTimeout(total=10)) as jda_resp:
                            location = jda_resp.headers.get("Location")
                            if location:
                                return {"resolvedUrl": location}

                if "union-click.jd.com/jda" in resolved_url:
                    async with session.get(resolved_url, headers=headers, allow_redirects=False, timeout=aiohttp.ClientTimeout(total=10)) as jda_resp:
                        location = jda_resp.headers.get("Location")
                        if location:
                            return {"resolvedUrl": location}

                jingfen_match = re.search(r"jingfen\.jd\.com/detail/([a-zA-Z0-9_-]+)\.html", url)
                if jingfen_match:
                    return {"resolvedUrl": url}

                return {"resolvedUrl": resolved_url}

    except Exception as e:
        print(f"[????] ??: {e}")
        import traceback
        traceback.print_exc()
        return {"resolvedUrl": request.get("url", "")}

@app.get("/api/bilibili/resolve")

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





async def resolve_bilibili_url(url: str):

    """解析 b23.tv / bilibili 短链接，返回最终 URL 及视频 ID"""

    if not url:

        raise HTTPException(status_code=400, detail="缺少 url 参数")



    if not any(domain in url for domain in ["b23.tv", "bilibili.com"]):

        raise HTTPException(status_code=400, detail="只支持解析 b23.tv 或 bilibili.com 链接")



    try:

        async with aiohttp.ClientSession() as session:

            async with session.get(url, allow_redirects=True, timeout=aiohttp.ClientTimeout(total=10)) as response:

                final_url = str(response.url)

                print(f"[B站解析] 最终URL: {final_url}")



        bvid_match = re.search(r'BV([a-zA-Z0-9]+)', final_url)

        av_match = re.search(r'av(\d+)', final_url, re.IGNORECASE)

        bvid = f"BV{bvid_match.group(1)}" if bvid_match else None

        avid = f"av{av_match.group(1)}" if av_match else None



        return {

            "status": "success",

            "resolvedUrl": final_url,

            "bvid": bvid,

            "avid": avid

        }

    except Exception as e:

        print(f"[B站解析] 解析失败: {e}")

        raise HTTPException(status_code=500, detail=f"解析短链接失败: {str(e)}")





async def extract_video_identity(raw_url: str):

    """根据输入的链接或BV号提取bvid/avid"""

    if not raw_url:

        raise HTTPException(status_code=400, detail="缺少 url 参数")



    trimmed = raw_url.strip()

    page = extract_page_number(trimmed)

    trimmed_no_query = re.sub(r'\?.*$', '', trimmed)



    if re.match(r'^BV[0-9A-Za-z]+$', trimmed, re.IGNORECASE):

        bvid = trimmed_no_query

        if not bvid.startswith('BV'):

            bvid = f'BV{bvid[2:]}'

        final_url = f'https://www.bilibili.com/video/{bvid}'

        return final_url, bvid, None, page



    if re.match(r'^av\d+$', trimmed, re.IGNORECASE):

        avid = trimmed_no_query.lower()

        final_url = f'https://www.bilibili.com/video/{avid}'

        return final_url, None, avid, page



    # 非直接 BV/av，尝试解析 URL

    if not trimmed.startswith('http'):

        trimmed = f'https://www.bilibili.com/video/{trimmed}'



    result = await resolve_bilibili_url(trimmed)

    final_url = result.get('resolvedUrl', trimmed)

    # 重新解析分页

    page = extract_page_number(final_url) or page

    return final_url, result.get('bvid'), result.get('avid'), page





async def fetch_subtitle_from_official_api(

    url: str,

    bvid: Optional[str] = None,

    page: int = 1,

    avid: Optional[str] = None

):

    """尝试通过官方接口获取字幕（包括AI自动字幕）"""

    try:

        if not bvid and not avid:

            _, bvid, avid, page_index = await extract_video_identity(url)

            if not page:

                page = page_index or 1

    except HTTPException:

        return None



    if not bvid and not avid:

        return None

    page = max(1, page or 1)



    headers = build_bilibili_headers({"Referer": url})



    try:

        async with aiohttp.ClientSession() as session:

            view_api = "https://api.bilibili.com/x/web-interface/view"

            params = {}

            if bvid:

                params["bvid"] = bvid

            elif avid:

                params["aid"] = re.sub(r'[^0-9]', '', avid)

            async with session.get(view_api, params=params, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:

                data = await resp.json()

                if data.get("code") != 0:

                    return None

                video_data = data.get("data", {})

                video_aid = str(video_data.get("aid") or "").strip()

                cid = video_data.get("cid")

                pages_info = video_data.get("pages") or []

                if pages_info:

                    target = next((item for item in pages_info if int(item.get("page", 0) or 0) == page), None)

                    if not target:

                        # 如果没有找到匹配页，降级为第一页

                        target = pages_info[0]

                    if target and target.get("cid"):

                        cid = target.get("cid")



            if not cid:

                return None



            normalized_aid = video_aid or (re.sub(r'[^0-9]', '', avid) if avid else None)

            subtitles = await fetch_wbi_subtitle_list(headers, bvid, normalized_aid, cid)



            if not subtitles:

                player_api = "https://api.bilibili.com/x/player/v2"

                params = {"cid": cid}

                if bvid:

                    params["bvid"] = bvid

                elif normalized_aid:

                    params["aid"] = normalized_aid

                async with session.get(player_api, params=params, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:

                    player_data = await resp.json()

                    subtitle_info = player_data.get("data", {}).get("subtitle", {}) or {}

                    subtitles = subtitle_info.get("subtitles", []) or []



            if not subtitles:

                return None



            preferred = ['zh-Hans', 'zh', 'zh-CN', 'zh-Hant', 'ai-zh', 'ai-zh-hans', 'ai-zh-cn']

            target = None

            for lan in preferred:

                target = next((item for item in subtitles if item.get('lan') == lan), None)

                if target:

                    break

            if not target:

                target = subtitles[0]



            subtitle_url = target.get('subtitle_url')

            if not subtitle_url:

                return None

            if subtitle_url.startswith('//'):

                subtitle_url = 'https:' + subtitle_url



            async with aiohttp.ClientSession() as dl_session:

                async with dl_session.get(subtitle_url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as resp:

                    if resp.status != 200:

                        return None

                    return await resp.json(content_type=None)

    except Exception as e:

        print(f"[B字幕API] 获取失败: {e}")

        return None





@app.post("/api/bilibili/video-info")

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





# ==================== 工具函数 ====================



def sanitize_filename(filename: str) -> str:

    """清理文件名"""

    return re.sub(r'[<>:"/\\|?*]', '_', filename)





def subtitle_cache_path(video_id: str, page: int) -> Path:

    safe_base = sanitize_filename(f"{video_id}_p{page}")

    return SUBTITLE_DIR / f"{safe_base}.cache.json"





def load_cached_subtitle(video_id: str, page: int):

    path = subtitle_cache_path(video_id, page)

    if not path.exists():

        return None

    try:

        data = json.loads(path.read_text(encoding='utf-8'))

        if isinstance(data, dict) and data.get("_v") == SUBTITLE_CACHE_VERSION:

            return data.get("payload")

    except Exception as e:

        print(f"[字幕缓存] 读取失败: {e}")

    return None





def save_subtitle_cache(video_id: str, page: int, data: dict):

    path = subtitle_cache_path(video_id, page)

    try:

        wrapped = {

            "_v": SUBTITLE_CACHE_VERSION,

            "timestamp": time.time(),

            "payload": data

        }

        path.write_text(json.dumps(wrapped, ensure_ascii=False), encoding='utf-8')

    except Exception as e:

        print(f"[字幕缓存] 写入失败: {e}")





# ==================== 模型加载 ====================

def rembg_token_configured() -> bool:
    return bool(os.getenv("HUGGINGFACE_HUB_TOKEN") or os.getenv("HF_TOKEN"))


def rembg_reset_download():
    global rembg_downloaded_bytes
    with rembg_download_lock:
        rembg_downloaded_bytes = 0


def rembg_add_downloaded(delta: int):
    global rembg_downloaded_bytes, rembg_progress
    if not delta:
        return
    with rembg_download_lock:
        rembg_downloaded_bytes += int(max(0, delta))
        total = rembg_download_total_bytes or 0
        if total > 0:
            rembg_progress = min(99, int(rembg_downloaded_bytes / total * 100))


if tqdm_auto:
    class RembgTqdm(tqdm_auto):
        def update(self, n=1):
            super().update(n)
            rembg_add_downloaded(n)
else:
    RembgTqdm = None


def ensure_rembg_model_info():
    global rembg_model_info, rembg_model_info_error, rembg_weight_filename, rembg_allow_patterns, rembg_download_total_bytes
    if rembg_model_info.get("size_mb") is not None or rembg_model_info_error:
        return
    if HfApi is None:
        rembg_model_info_error = "huggingface_hub not available"
        return
    try:
        token = os.getenv("HUGGINGFACE_HUB_TOKEN") or os.getenv("HF_TOKEN")
        hf_endpoint = get_hf_endpoint()
        if hf_endpoint:
            os.environ["HF_ENDPOINT"] = hf_endpoint
        api = HfApi(token=token, endpoint=hf_endpoint)
        info = api.model_info(rembg_model_id, files_metadata=True)
        weight_filename = None
        weight_size = None
        for target_name in ("model.safetensors", "pytorch_model.bin"):
            for sibling in info.siblings:
                if sibling.rfilename == target_name and getattr(sibling, "size", None):
                    weight_filename = target_name
                    weight_size = sibling.size
                    break
            if weight_filename:
                break
        if weight_size is None:
            weight_size = sum((s.size or 0) for s in info.siblings)
        rembg_weight_filename = weight_filename or "model.safetensors"
        rembg_allow_patterns = [
            rembg_weight_filename,
            "config.json",
            "preprocessor_config.json",
            "birefnet.py",
            "BiRefNet_config.py"
        ]
        if weight_size:
            rembg_model_info["size_bytes"] = int(weight_size)
            rembg_model_info["size_mb"] = int((weight_size + 1024 * 1024 - 1) // (1024 * 1024))
            rembg_download_total_bytes = int(weight_size)
    except Exception as exc:
        rembg_model_info_error = str(exc)



@app.get("/api/rembg/init")

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





@app.get("/api/rembg/progress")

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





# ==================== 视频下载 ====================



class YTDLPLogger:

    def __init__(self):

        self.progress = 0

        self.status = "准备中"



    def debug(self, msg):

        if "[download]" in msg:

            match = re.search(r'(\d+\.?\d*)%', msg)

            if match:

                self.progress = float(match.group(1))



    def info(self, msg):

        self.status = msg



    def warning(self, msg):

        pass



    def error(self, msg):

        self.status = f"错误: {msg}"





@app.post("/api/video/download")

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





# ==================== 字幕提取 ====================



@app.post("/api/video/subtitle")

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

        print(f"[字幕缓存] 命中 {video_id} P{page}")

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

        print(f"[字幕] yt-dlp 获取失败，尝试官方接口: {e}")

        fallback_subtitle = await fetch_subtitle_from_official_api(final_url, bvid=bvid, page=page, avid=avid)

        if fallback_subtitle:

            save_subtitle_cache(video_id, page, fallback_subtitle)

            return {

                "status": "success",

                "video_id": video_id,

                "subtitle": fallback_subtitle

            }

        raise HTTPException(status_code=500, detail=f"获取字幕失败: {str(e)}")





# ==================== DeepSeek 语义分段 ====================



@app.post("/api/subtitle/segment")

async def segment_subtitle(request: dict):

    """使用 DeepSeek 对字幕进行语义分段"""

    try:

        # 解析字幕数据

        events = request.get('events', [])

        if not events:

            raise HTTPException(status_code=400, detail="字幕数据格式错误")



        # 构建无时间戳的原始文本

        text_parts = []

        for event in events:

            content = (event.get('content') or '').strip()

            if content:

                text_parts.append(content)



        raw_text = "\n".join(text_parts).strip()



        if not raw_text:

            raise HTTPException(status_code=400, detail="字幕内容为空")



        # 调用 DeepSeek API 进行智能排版

        trimmed_text = raw_text[:10000]

        instruction = """【你是一位资深的文案排版助手。我会给你一段没有标点的视频字幕提取文案，请按以下要求处理：

添加标点： 为文案补充正确的标点符号，使逻辑清晰。

禁止修改： 严禁修改、增加或删除原有的任何文字词汇，保持原汁原味。

格式限制： 全文禁止使用双引号（""）。

商品分段： 识别文案中的不同商品或主题，并在每个商品介绍之间进行分段。

只输出排版后的文案，不要包含任何多余的开场白或解释。】"""

        prompt = f"""{instruction}



文案内容：

{trimmed_text}



请严格按照要求输出排版后的文案。"""



        response = await asyncio.to_thread(

            deepseek_client.chat.completions.create,

            model=DEEPSEEK_MODEL,

            messages=[

                {"role": "system", "content": "你是电商文案排版助手，只能在不改动原始词汇的前提下添加标点与分段。"},

                {"role": "user", "content": prompt}

            ],

            temperature=0.2

        )



        result_text = response.choices[0].message.content.strip()

        if not result_text:

            raise HTTPException(status_code=500, detail="AI 排版返回为空")



        return {

            "status": "success",

            "original": events,

            "segmented": result_text

        }



    except Exception as e:

        raise HTTPException(status_code=500, detail=f"语义分段失败: {str(e)}")





# ==================== 图片参数识别 ====================



PRICE_PATTERN = re.compile(

    r'(?:¥|￥)\s*\d+(?:\.\d+)?|\d+(?:\.\d+)?\s*(?:元|块|人民币|rmb|cny|港币|块钱)',

    re.IGNORECASE

)





def normalize_price_value(value: Optional[str]) -> Optional[str]:

    if value is None:

        return None

    cleaned = str(value).replace(',', '').strip()

    if not cleaned:

        return None



    if re.search(r'(?:g|kg|克|斤|磅)(?:$|\b)', cleaned, re.IGNORECASE):

        return None



    digits = re.search(r'\d+(?:\.\d+)?', cleaned)

    if not digits:

        return None

    amount = digits.group(0)

    if '.' in amount:

        amount = amount.rstrip('0').rstrip('.')

        if not amount:

            amount = digits.group(0)

    return f"{amount}元"





def extract_price_from_text(text: str) -> Optional[str]:

    if not text:

        return None

    match = PRICE_PATTERN.search(text)

    if not match:

        return None

    return normalize_price_value(match.group(0))



@app.post("/api/image/recognize")

async def recognize_image_params(file: UploadFile = File(...)):

    """使用通义千问 VL 识别图片中的产品参数"""

    try:

        # 读取图片

        contents = await file.read()

        image_base64 = base64.b64encode(contents).decode('utf-8')



        prompt_text = (

            "请识别这张图片中的所有产品参数，尤其是价格。"

            "输出必须严格符合 JSON 模板，禁止出现任何无关字符。"

            'JSON 模板：{"product_name":"xxx","price":"178元","parameters":[{"name":"参数名","value":"参数值"}],"additional_notes":["总结1","总结2"]}。'

            "price 字段只能使用“数字+元”格式（如“178元”“259.9元”），不要保留￥符号，也不要把“273g”等重量误判为价格。"

            "务必提取价格：只要图片中出现“￥499”“建议入手价 369”“售价 860 左右”等描述，都需要解析成价格；若只出现“约 499”，也要补全为“499元”。"

            "若出现整体卖点或一句话总结，请按原意放入 additional_notes 数组，一条信息一行。"

        )



        # 调用通义千问 VL API

        messages = [

            {

                'role': 'system',

                'content': '你是专业的产品参数识别助手。请从图片中识别所有产品参数，并以 JSON 格式返回。'

            },

            {

                'role': 'user',

                'content': [

                    {'image': f"data:image/jpeg;base64,{image_base64}"},

                    {'text': prompt_text}

                ]

            }

        ]



        response = MultiModalConversation.call(

            model='qwen-vl-plus',

            api_key=DASHSCOPE_API_KEY,

            messages=messages,

            result_format='message'

        )



        result_text = response.output.choices[0].message.content[0]['text']



        # 尝试解析 JSON

        try:

            params = json.loads(result_text)

        except json.JSONDecodeError:

            match = re.search(r'\{[\s\S]*\}', result_text)

            if match:

                params = json.loads(match.group())

            else:

                params = {"raw_text": result_text}



        if not isinstance(params, dict):

            params = {"raw_text": result_text}



        parameters = params.get("parameters")

        if not isinstance(parameters, list):

            parameters = []

        params["parameters"] = parameters



        if not params.get("product_name") and params.get("product"):

            params["product_name"] = params.get("product")



        price_from_params = next(

            (item.get("value") for item in parameters

             if isinstance(item, dict) and item.get("name") and '价' in item.get("name")),

            None

        )

        extracted_price = extract_price_from_text(result_text)

        price_text = None

        for candidate in (params.get("price"), price_from_params):

            normalized = normalize_price_value(candidate)

            if normalized:

                price_text = normalized

                break

        if not price_text and extracted_price:

            price_text = extracted_price

        if price_text:

            params["price"] = price_text

            price_entry_found = False

            for item in parameters:

                if isinstance(item, dict) and item.get("name") and '价' in item.get("name"):

                    item["value"] = price_text

                    price_entry_found = True

            if not price_entry_found:

                parameters.append({"name": "价格", "value": price_text})



        additional_notes = params.get("additional_notes")

        if isinstance(additional_notes, str) and additional_notes.strip():

            params["additional_notes"] = [additional_notes.strip()]

        elif not isinstance(additional_notes, list):

            params["additional_notes"] = []



        return {

            "status": "success",

            "params": params

        }



    except Exception as e:

        raise HTTPException(status_code=500, detail=f"识别失败: {str(e)}")





# ==================== 京东主图抓取 ====================



class SummaryRewriteRequest(BaseModel):

    name: str = ''

    price: str = ''

    params: Dict[str, str] = Field(default_factory=dict)

    summary: Optional[str] = ''





@app.post("/api/image/rewrite-summary")

async def rewrite_image_summary(req: SummaryRewriteRequest):

    if not DEEPSEEK_API_KEY:

        raise HTTPException(status_code=500, detail="未配置 DeepSeek API 密钥")

    try:

        param_lines = []

        for key, value in (req.params or {}).items():

            if value is None:

                continue

            param_lines.append(f"- {key}: {value}")

        param_text = "\n".join(param_lines) if param_lines else "暂无详细参数"

        prompt = (

            "请扮演资深品牌创意编辑，基于下方产品信息提炼一句或两句极短的总结。"

            "避免堆砌参数，只捕捉能让用户立即产生兴趣的核心亮点，语言要有画面感、易读且不夸张。"

        )

        user_content = (

            f"{prompt}\n\n"

            f"产品名称：{req.name or '未知产品'}\n"

            f"价格：{req.price or '未知价格'}\n"

            f"参数：\n{param_text}\n"

            f"已有总结：{req.summary or '暂无'}"

        )

        async def request_summary(model_name: str):

            return await asyncio.to_thread(

                deepseek_client.chat.completions.create,

                model=model_name,

                messages=[

                    {"role": "system", "content": "你是电商商品文案专家，会客观凝练总结卖点。"},

                    {"role": "user", "content": user_content}

                ],

                temperature=0.2

            )



        model_in_use = DEEPSEEK_MODEL or "deepseek-chat"

        try:

            response = await request_summary(model_in_use)

        except Exception as e:

            err = str(e)

            if "Model Not Exist" in err and model_in_use != "deepseek-chat":

                response = await request_summary("deepseek-chat")

            else:

                raise

        summary_text = response.choices[0].message.content.strip()

        if not summary_text:

            raise HTTPException(status_code=500, detail="AI 未返回总结")

        return {"status": "success", "summary": summary_text}

    except HTTPException:

        raise

    except Exception as e:

        message = str(e)

        if "Model Not Exist" in message:

            raise HTTPException(

                status_code=500,

                detail="总结改写失败：DeepSeek 模型无效，请将 DEEPSEEK_MODEL 设置为可用的模型（建议 deepseek-chat）。"

            )

        raise HTTPException(status_code=500, detail=f"总结改写失败: {message}")



@app.post("/api/jd/images")

async def fetch_jd_images(url: str = Form(...)):

    """获取京东商品前5张主图"""

    try:

        # 提取商品 ID

        sku_match = re.search(r'/(\d+)\.html', url)

        if not sku_match:

            sku_match = re.search(r'item\.jd\.com.*?(\d+)', url)

        if not sku_match:

            raise HTTPException(status_code=400, detail="无法识别京东商品链接")



        sku_id = sku_match.group(1)



        # 调用京东 API

        api_url = f"https://item.jd.com/{sku_id}.html"



        async with aiohttp.ClientSession() as session:

            async with session.get(api_url) as resp:

                if resp.status != 200:

                    raise HTTPException(status_code=400, detail="获取商品页面失败")

                html = await resp.text(errors='ignore')



        # 提取图片数据

        images = []

        for pattern in [

            r'"imgUrl":"([^"]+)"',

            r'"imageList":\s*\[([^\]]+)\]',

            r'//img\d+\.360buyimg\.com/[^"]+\.jpg'

        ]:

            matches = re.findall(pattern, html)

            for match in matches[:5]:

                img_url = match if isinstance(match, str) else match[0]

                if img_url.startswith('//'):

                    img_url = 'https:' + img_url

                images.append(img_url)

            if images:

                break



        # 去重并限制数量

        seen = set()

        unique_images = []

        for img in images:

            if img not in seen:

                seen.add(img)

                unique_images.append(img)

            if len(unique_images) >= 5:

                break



        return {

            "status": "success",

            "sku_id": sku_id,

            "images": [{"url": url} for url in unique_images]

        }



    except Exception as e:

        raise HTTPException(status_code=500, detail=f"获取图片失败: {str(e)}")





# ==================== 一键抠图 ====================



async def ensure_rembg_ready():

    """确保 RMBG 模型已就绪"""

    global rembg_session, rembg_error

    if rembg_session is not None:

        return



    await init_rembg_model()

    for _ in range(200):

        await asyncio.sleep(0.1)

        if rembg_session is not None:

            return
        if rembg_error:
            break

    if rembg_error:
        raise RuntimeError(rembg_error)
    raise RuntimeError("RMBG 模型正在加载，请稍后再试")





def improve_alpha_edges(output_image: Image.Image, mode: str = 'standard') -> Image.Image:

    """细化 alpha 边缘并自动裁剪"""

    if output_image.mode != 'RGBA':

        output_image = output_image.convert('RGBA')

    alpha = output_image.split()[3]

    try:

        alpha = alpha.point(lambda p: 0 if p < 25 else p)

        if mode == 'precise':

            alpha = alpha.filter(ImageFilter.MaxFilter(5))

        alpha = alpha.filter(ImageFilter.MaxFilter(3))

        alpha = alpha.filter(ImageFilter.MinFilter(3))

        alpha = alpha.filter(ImageFilter.SMOOTH)

        alpha = alpha.filter(ImageFilter.GaussianBlur(1.2))

    except ValueError:

        pass

    output_image.putalpha(alpha)



    mask = alpha.point(lambda p: 255 if p > 10 else 0)

    bbox = mask.getbbox()

    if bbox:

        output_image = output_image.crop(bbox)

    return output_image


def run_rmbg_model(input_image: Image.Image) -> Image.Image:

    global rembg_session, rembg_transform, rembg_device, rembg_to_pil

    if rembg_session is None or rembg_transform is None or rembg_device is None:
        raise RuntimeError("RMBG 模型未初始化")

    image = ImageOps.exif_transpose(input_image)
    rgb_image = image.convert('RGB')
    input_tensor = rembg_transform(rgb_image).unsqueeze(0).to(rembg_device)

    with torch.no_grad():
        pred = rembg_session(input_tensor)[-1].sigmoid().cpu()

    mask = rembg_to_pil(pred[0].squeeze())
    mask = mask.resize(image.size)

    output_image = image.convert('RGBA')
    output_image.putalpha(mask)
    return output_image





async def remove_background_from_bytes(contents: bytes, mode: str = 'standard') -> Tuple[bytes, str]:

    """抠图并返回 PNG 字节与 base64 预览"""

    await ensure_rembg_ready()



    input_image = Image.open(io.BytesIO(contents))

    if input_image.mode != 'RGBA':

        input_image = input_image.convert('RGBA')
    output_image = run_rmbg_model(input_image)

    output_image = improve_alpha_edges(output_image, mode)



    buffered = io.BytesIO()

    output_image.save(buffered, format='PNG')

    png_bytes = buffered.getvalue()

    preview_base64 = base64.b64encode(png_bytes).decode('utf-8')

    return png_bytes, preview_base64



@app.post("/api/image/removebg")

async def remove_background(

    file: UploadFile = File(...),

    mode: str = Form('standard')

):

    """去除图片背景"""

    global rembg_session, rembg_error



    if rembg_session is None:

        # 尝试初始化模型

        await init_rembg_model()

        # 等待模型加载

        for _ in range(100):

            await asyncio.sleep(0.1)

            if rembg_session is not None:

                break
            if rembg_error:
                break



    if rembg_session is None:

        detail = rembg_error or "模型正在加载中，请稍后再试"
        raise HTTPException(status_code=503, detail=detail)



    try:

        # 读取图片

        contents = await file.read()

        input_image = Image.open(io.BytesIO(contents))



        # 转换为 RGBA

        if input_image.mode != 'RGBA':

            input_image = input_image.convert('RGBA')



        # 去除背景
        output_image = run_rmbg_model(input_image)
        output_image = improve_alpha_edges(output_image, mode)



        # 保存到临时文件

        temp_path = DOWNLOAD_DIR / "temp_images" / "removebg"

        temp_path.mkdir(parents=True, exist_ok=True)



        output_filename = f"nobg_{file.filename.rsplit('.', 1)[0] if '.' in file.filename else 'image'}.png"

        output_path = temp_path / output_filename



        # 保存

        output_image.save(output_path, 'PNG')



        # 转换为 base64 返回预览

        buffered = io.BytesIO()

        output_image.save(buffered, format='PNG')

        img_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')



        return {

            "status": "success",

            "filename": output_filename,

            "preview": f"data:image/png;base64,{img_base64}",

            "path": str(output_path)

        }



    except Exception as e:

        raise HTTPException(status_code=500, detail=f"抠图失败: {str(e)}")





# ==================== 飞书多维表格 ====================





class FeishuTableConfig(BaseModel):

    link: str

    mode: Literal['append', 'replace'] = 'append'



    @validator('link')

    def validate_link(cls, value: str) -> str:

        return (value or '').strip()



    @validator('mode')

    def normalize_mode(cls, value: str) -> str:

        return (value or 'append').lower()





class FeishuExportRequest(BaseModel):

    productTable: FeishuTableConfig

    specTable: Optional[FeishuTableConfig] = None

    products: List[Dict[str, Any]]



    @validator('products')

    def validate_products(cls, value: List[Dict[str, Any]]) -> List[Dict[str, Any]]:

        if not value:

            raise ValueError("没有可写入的商品数据")

        return value





async def get_feishu_http_client() -> httpx.AsyncClient:

    global feishu_http_client

    if feishu_http_client is None:

        feishu_http_client = httpx.AsyncClient(timeout=30.0)

    return feishu_http_client





async def get_feishu_token() -> str:

    if not FEISHU_APP_ID or not FEISHU_APP_SECRET:

        raise HTTPException(status_code=400, detail="尚未配置 FEISHU_APP_ID/FEISHU_APP_SECRET")



    now = time.time()

    cached = feishu_token_cache.get("token")

    if cached and now < feishu_token_cache.get("expires_at", 0) - 60:

        return cached



    client = await get_feishu_http_client()

    try:

        resp = await client.post(

            f"{FEISHU_API_BASE}/auth/v3/tenant_access_token/internal/",

            json={

                "app_id": FEISHU_APP_ID,

                "app_secret": FEISHU_APP_SECRET

            },

            timeout=30

        )

        resp.raise_for_status()

    except httpx.HTTPError as exc:

        raise HTTPException(status_code=502, detail=f"获取飞书 token 失败: {exc}") from exc



    payload = resp.json()

    if payload.get("code", 0) != 0:

        raise HTTPException(status_code=400, detail=f"获取飞书 token 失败: {payload.get('msg')}")



    token = payload.get("tenant_access_token")

    expires_in = payload.get("expire", payload.get("expire_in", 7200))

    feishu_token_cache.update({

        "token": token,

        "expires_at": now + max(expires_in, 60)

    })

    return token





async def feishu_request(

    method: str,

    endpoint: str,

    token: str,

    *,

    params: Optional[Dict[str, Any]] = None,

    json_payload: Optional[Dict[str, Any]] = None,

    data: Optional[Dict[str, Any]] = None,

    files: Optional[Dict[str, Any]] = None,

) -> Dict[str, Any]:

    client = await get_feishu_http_client()

    url = endpoint if endpoint.startswith("http") else f"{FEISHU_API_BASE}{endpoint}"

    headers = {

        "Authorization": f"Bearer {token}"

    }

    if json_payload is not None:

        headers["Content-Type"] = "application/json"

    try:

        response = await client.request(

            method,

            url,

            params=params,

            json=json_payload,

            data=data,

            files=files,

            headers=headers,

            timeout=30

        )

        response.raise_for_status()

    except httpx.HTTPError as exc:

        raise HTTPException(status_code=502, detail=f"飞书接口网络异常: {exc}") from exc



    payload = response.json()

    if payload.get("code", 0) != 0:

        raise HTTPException(status_code=400, detail=f"飞书接口报错: {payload.get('msg')}")

    return payload.get("data") or {}





def parse_bitable_link(link: str) -> Tuple[str, str]:

    parsed = urlparse(link)

    query = parse_qs(parsed.query)



    app_token = ''

    table_id = ''



    for key in ('appToken', 'app_token', 'appId', 'app_id'):

        if query.get(key):

            app_token = query[key][0]

            break



    for key in ('tableId', 'table_id', 'tbl'):

        if query.get(key):

            table_id = query[key][0]

            break



    segments = [segment for segment in parsed.path.split('/') if segment]

    for segment in segments:

        if not app_token and segment.startswith('app'):

            app_token = segment

        if not table_id and segment.startswith('tbl'):

            table_id = segment



    if not app_token:

        match = re.search(r'(app[a-zA-Z0-9]{6,})', link)

        if match:

            app_token = match.group(1)

    if not table_id:

        match = re.search(r'(tbl[a-zA-Z0-9]{6,})', link)

        if match:

            table_id = match.group(1)



    if not app_token or not table_id:

        raise ValueError("无法解析飞书链接，请粘贴包含 appToken/tableId 的地址")

    return app_token, table_id





async def list_bitable_fields(token: str, app_token: str, table_id: str) -> Dict[str, Dict[str, Any]]:

    fields: Dict[str, Dict[str, Any]] = {}

    page_token = None

    while True:

        params = {"page_size": 200}

        if page_token:

            params["page_token"] = page_token

        data = await feishu_request(

            "GET",

            f"/bitable/v1/apps/{app_token}/tables/{table_id}/fields",

            token,

            params=params

        )

        for item in data.get("items", []):

            name = item.get("field_name")

            if name:

                fields[name] = item

        if not data.get("has_more"):

            break

        page_token = data.get("page_token")

        if not page_token:

            break

    return fields





async def ensure_bitable_fields(

    token: str,

    app_token: str,

    table_id: str,

    required_fields: List[Dict[str, Any]]

) -> None:

    existing = await list_bitable_fields(token, app_token, table_id)

    for field in required_fields:

        name = field["name"]

        if name in existing:

            continue

        payload = {

            "field_name": name,

            "type": field["type"],

            "property": field.get("property") or {}

        }

        await feishu_request(

            "POST",

            f"/bitable/v1/apps/{app_token}/tables/{table_id}/fields",

            token,

            json_payload=payload

        )





async def delete_all_bitable_records(token: str, app_token: str, table_id: str) -> None:

    page_token = None

    while True:

        params = {"page_size": 200}

        if page_token:

            params["page_token"] = page_token

        data = await feishu_request(

            "GET",

            f"/bitable/v1/apps/{app_token}/tables/{table_id}/records",

            token,

            params=params

        )

        record_ids = [item["record_id"] for item in data.get("items", []) if item.get("record_id")]

        if record_ids:

            await feishu_request(

                "POST",

                f"/bitable/v1/apps/{app_token}/tables/{table_id}/records/batch_delete",

                token,

                json_payload={"record_ids": record_ids}

            )

        if not data.get("has_more"):

            break

        page_token = data.get("page_token")

        if not page_token:

            break





async def upload_bitable_image(token: str, app_token: str, filename: str, png_bytes: bytes) -> Optional[str]:

    data = {

        "file_name": filename,

        "parent_type": "bitable_image",

        "parent_token": app_token

    }

    files = {

        "file": (filename, png_bytes, "image/png")

    }

    result = await feishu_request(

        "POST",

        "/drive/v1/medias/upload_all",

        token,

        data=data,

        files=files

    )

    return result.get("file_token")





def chunk_list(items: List[Dict[str, Any]], size: int = 100) -> List[List[Dict[str, Any]]]:

    return [items[i:i + size] for i in range(0, len(items), size)]





async def batch_create_records(

    token: str,

    app_token: str,

    table_id: str,

    rows: List[Dict[str, Any]]

) -> int:

    if not rows:

        return 0

    total = 0

    for chunk in chunk_list(rows, 100):

        payload = {"records": [{"fields": row} for row in chunk]}

        await feishu_request(

            "POST",

            f"/bitable/v1/apps/{app_token}/tables/{table_id}/records/batch_create",

            token,

            json_payload=payload

        )

        total += len(chunk)

    return total





def normalize_http_url(url: Optional[str]) -> Optional[str]:

    if not url:

        return None

    url = url.strip()

    if url.startswith('data:'):

        return url

    if url.startswith('//'):

        return 'https:' + url

    if re.match(r'^https?://', url):

        return url

    if url.startswith('www.'):

        return f"https://{url}"

    return url





async def fetch_image_bytes(session: aiohttp.ClientSession, url: str) -> Optional[bytes]:

    normalized = normalize_http_url(url)

    if not normalized or normalized.startswith('data:'):

        return None

    try:

        async with session.get(normalized, timeout=aiohttp.ClientTimeout(total=20)) as resp:

            if resp.status == 200:

                return await resp.read()

    except Exception as exc:

        print(f"[feishu] 下载图片失败: {exc}")

    return None





async def build_transparent_png(

    product: Dict[str, Any],

    session: aiohttp.ClientSession

) -> Optional[bytes]:

    explicit = product.get("transparentImage") or product.get("transparent_image")

    if isinstance(explicit, str) and explicit.startswith('data:'):

        try:

            _, encoded = explicit.split(',', 1)

            return base64.b64decode(encoded)

        except Exception:

            pass



    image_url = explicit or product.get("image")

    if not image_url:

        return None



    if isinstance(image_url, str) and image_url.startswith('data:'):

        try:

            _, encoded = image_url.split(',', 1)

            return base64.b64decode(encoded)

        except Exception:

            return None



    raw_bytes = await fetch_image_bytes(session, image_url)

    if not raw_bytes:

        return None



    try:

        png_bytes, _ = await remove_background_from_bytes(raw_bytes)

        return png_bytes

    except Exception as exc:

        print(f"[feishu] 生成透明图失败: {exc}")

        return None





def build_image_cache_key(product: Dict[str, Any]) -> Optional[str]:

    for key in ("transparentImageKey", "image", "standardUrl", "materialUrl", "originalLink", "skuId", "id"):

        value = product.get(key)

        if not value:

            continue

        if isinstance(value, str) and value.startswith('data:'):

            return hashlib.md5(value.encode('utf-8')).hexdigest()

        return str(value)

    return None





async def ensure_image_token(

    product: Dict[str, Any],

    token: str,

    app_token: str,

    session: aiohttp.ClientSession,

    cache: Dict[str, str]

) -> Optional[str]:

    cache_key = build_image_cache_key(product)

    if cache_key and cache_key in cache:

        return cache[cache_key]



    png_bytes = await build_transparent_png(product, session)

    if not png_bytes:

        return None



    title = product.get("customName") or product.get("name") or "image"

    filename = f"{sanitize_filename(title)}.png"

    file_token = await upload_bitable_image(token, app_token, filename, png_bytes)

    if cache_key and file_token:

        cache[cache_key] = file_token

    return file_token





def safe_float(value: Any) -> Optional[float]:

    if value in (None, '', 'null'):

        return None

    try:

        return float(value)

    except (TypeError, ValueError):

        try:

            return float(Decimal(str(value)))

        except (InvalidOperation, ValueError, TypeError):

            return None





def safe_int(value: Any) -> Optional[int]:

    flt = safe_float(value)

    if flt is None:

        return None

    try:

        return int(round(flt))

    except (ValueError, TypeError):

        return None





def format_percentage(value: Any) -> Optional[str]:

    flt = safe_float(value)

    if flt is None:

        return None

    return f"{flt:.2f}%"





def extract_source_info(product: Dict[str, Any]) -> Tuple[str, str, str]:

    source = product.get("sourceVideo") or {}

    title = source.get("title") or ''

    author = source.get("author") or source.get("up") or (source.get("owner") or {}).get("name") or ''

    link = source.get("originalUrl") or source.get("url") or ''

    return title, author, link





def get_product_link(product: Dict[str, Any]) -> Optional[str]:

    for key in ("standardUrl", "materialUrl", "originalLink"):

        link = normalize_http_url(product.get(key))

        if link:

            return link

    return None





def resolve_product_title(product: Dict[str, Any]) -> str:

    return str(product.get("customName") or product.get("name") or "未命名商品")





def resolve_product_id(product: Dict[str, Any]) -> str:

    return str(product.get("skuId") or product.get("id") or product.get("itemId") or '')





def build_product_record(product: Dict[str, Any], attachment_token: Optional[str]) -> Dict[str, Any]:

    title = resolve_product_title(product)

    fields: Dict[str, Any] = {

        "商品标题": title,

        "商品ID": resolve_product_id(product),

        "价格(元)": safe_float(product.get("price")),

        "佣金(元)": safe_float(product.get("commission")),

        "佣金比例": format_percentage(product.get("commissionRate")),

        "30天销量": safe_int(product.get("sales30Days")),

        "评价数": safe_int(product.get("comments")),

        "店铺名称": product.get("shopName") or '',

        "参数摘要": product.get("specSummary") or product.get("specEntrySummary") or '',

        "排序": safe_int(product.get("sortOrder")),

    }



    link = get_product_link(product)

    if link:

        fields["商品链接"] = link



    source_title, source_author, source_link = extract_source_info(product)

    if source_title:

        fields["来源视频"] = source_title

    if source_author:

        fields["UP主"] = source_author

    if source_link:

        fields["来源链接"] = source_link



    if attachment_token:

        fields["透明主图"] = [{

            "name": f"{sanitize_filename(title)}.png",

            "token": attachment_token

        }]

    return fields





def build_spec_record(

    product: Dict[str, Any],

    param_keys: List[str]

) -> Dict[str, Any]:

    fields: Dict[str, Any] = {

        "商品标题": resolve_product_title(product),

        "商品ID": resolve_product_id(product),

        "参数摘要": product.get("specSummary") or product.get("specEntrySummary") or '',

        "排序": safe_int(product.get("sortOrder")),

    }

    link = get_product_link(product)

    if link:

        fields["商品链接"] = link

    source_title, source_author, source_link = extract_source_info(product)

    if source_title:

        fields["来源视频"] = source_title

    if source_author:

        fields["UP主"] = source_author

    if source_link:

        fields["来源链接"] = source_link



    params = product.get("specParams") or {}

    for key in param_keys:

        value = params.get(key)

        if value not in (None, ''):

            fields[key] = str(value)

    return fields





@app.post("/api/feishu/bitable/export")

async def export_feishu_bitable(payload: FeishuExportRequest):

    """将商品列表写入飞书多维表格"""

    if not payload.productTable.link:

        raise HTTPException(status_code=400, detail="请填写商品表链接")

    try:

        product_app_token, product_table_id = parse_bitable_link(payload.productTable.link)

    except ValueError as exc:

        raise HTTPException(status_code=400, detail=str(exc))



    spec_app_token = spec_table_id = None

    if payload.specTable and payload.specTable.link:

        try:

            spec_app_token, spec_table_id = parse_bitable_link(payload.specTable.link)

        except ValueError as exc:

            raise HTTPException(status_code=400, detail=f"参数表链接无效: {exc}")



    token = await get_feishu_token()



    product_fields = [

        {"name": "商品标题", "type": 1},

        {"name": "商品ID", "type": 1},

        {"name": "价格(元)", "type": 2},

        {"name": "佣金(元)", "type": 2},

        {"name": "佣金比例", "type": 1},

        {"name": "30天销量", "type": 2},

        {"name": "评价数", "type": 2},

        {"name": "店铺名称", "type": 1},

        {"name": "商品链接", "type": 17},

        {"name": "透明主图", "type": 15},

        {"name": "参数摘要", "type": 1},

        {"name": "来源视频", "type": 1},

        {"name": "来源链接", "type": 17},

        {"name": "UP主", "type": 1},

        {"name": "排序", "type": 2},

    ]



    await ensure_bitable_fields(token, product_app_token, product_table_id, product_fields)



    param_keys: List[str] = []

    if spec_app_token and spec_table_id:

        seen: Set[str] = set()

        for product in payload.products:

            params = product.get("specParams") or {}

            for key in params.keys():

                cleaned = str(key).strip()

                if cleaned and cleaned not in seen:

                    seen.add(cleaned)

        param_keys = sorted(seen)

        # 限制字段数量避免超出表格限制

        if len(param_keys) > 80:

            param_keys = param_keys[:80]



        base_fields = [

            {"name": "商品标题", "type": 1},

            {"name": "商品ID", "type": 1},

            {"name": "商品链接", "type": 17},

            {"name": "参数摘要", "type": 1},

            {"name": "来源视频", "type": 1},

            {"name": "来源链接", "type": 17},

            {"name": "UP主", "type": 1},

            {"name": "排序", "type": 2},

        ]

        param_fields = [{"name": key, "type": 1} for key in param_keys]

        await ensure_bitable_fields(

            token,

            spec_app_token,

            spec_table_id,

            base_fields + param_fields

        )



    if payload.productTable.mode == 'replace':

        await delete_all_bitable_records(token, product_app_token, product_table_id)

    if spec_app_token and spec_table_id and payload.specTable and payload.specTable.mode == 'replace':

        await delete_all_bitable_records(token, spec_app_token, spec_table_id)



    session = aiohttp.ClientSession()

    image_token_cache: Dict[str, str] = {}

    try:

        product_rows: List[Dict[str, Any]] = []

        spec_rows: List[Dict[str, Any]] = []



        for product in payload.products:

            attachment_token = await ensure_image_token(

                product,

                token,

                product_app_token,

                session,

                image_token_cache

            )

            product_rows.append(build_product_record(product, attachment_token))

            if spec_app_token and spec_table_id:

                spec_rows.append(build_spec_record(product, param_keys))



        created_products = await batch_create_records(

            token,

            product_app_token,

            product_table_id,

            product_rows

        )

        created_specs = 0

        if spec_app_token and spec_table_id and spec_rows:

            created_specs = await batch_create_records(

                token,

                spec_app_token,

                spec_table_id,

                spec_rows

            )

    finally:

        await session.close()



    response = {

        "status": "success",

        "productTable": {

            "appToken": product_app_token,

            "tableId": product_table_id,

            "records": created_products

        }

    }

    if spec_app_token and spec_table_id:

        response["specTable"] = {

            "appToken": spec_app_token,

            "tableId": spec_table_id,

            "records": created_specs

        }

    return response





# ==================== 导出文件 ====================



@app.post("/api/export/txt")

async def export_txt(request: dict):

    """导出为 TXT 文件"""

    try:

        temp_path = DOWNLOAD_DIR / "exports"

        temp_path.mkdir(parents=True, exist_ok=True)



        title = request.get('title', '口播稿')

        filename = f"{sanitize_filename(title)}.txt"

        output_path = temp_path / filename



        with open(output_path, 'w', encoding='utf-8') as f:

            f.write(f"{'='*20} {title} {'='*20}\n\n")



            sections = request.get('sections', [])

            for section in sections:

                section_type = section.get('type', '')

                if section_type:

                    f.write(f"\n【{section_type}】\n")



                text = section.get('text', '')

                f.write(text + "\n")



        return FileResponse(output_path, filename=filename, media_type='text/plain; charset=utf-8')



    except Exception as e:

        raise HTTPException(status_code=500, detail=f"导出失败: {str(e)}")





# ==================== 方案文案与模板 ====================



def build_scheme_items_text(items: List[Dict[str, Any]]) -> str:

    lines = []

    for index, item in enumerate(items[:50], start=1):

        title = str(item.get("title") or "未命名商品").strip()

        price = str(item.get("price") or "--").strip()

        commission = str(item.get("commission") or "--").strip()

        rate = str(item.get("commissionRate") or item.get("commission_rate") or "--").strip()

        sales = str(item.get("sales30Days") or "--").strip()

        comments = str(item.get("comments") or "--").strip()

        shop = str(item.get("shopName") or "--").strip()

        params = item.get("params") or {}

        param_preview = "、".join([f"{k}:{v}" for k, v in list(params.items())[:6]]) if isinstance(params, dict) else ""

        if param_preview:

            param_preview = f" | 参数:{param_preview}"

        lines.append(

            f"{index}. {title} | 价格:{price} | 佣金:{commission} | 比例:{rate} | 销量:{sales} | 评价:{comments} | 店铺:{shop}{param_preview}"

        )

    return "\n".join(lines)





class PromptTemplateUpdate(BaseModel):

    content: str = ''





class SchemeGenerateRequest(BaseModel):

    type: str

    prompt: Optional[str] = ''

    items: List[Dict[str, Any]] = Field(default_factory=list)





class SchemeCreate(BaseModel):

    name: str

    category_id: str

    category_name: Optional[str] = None

    remark: Optional[str] = None

    items: List[Dict[str, Any]] = Field(default_factory=list)





class SchemeUpdate(BaseModel):

    name: Optional[str] = None

    category_id: Optional[str] = None

    category_name: Optional[str] = None

    remark: Optional[str] = None

    items: Optional[List[Dict[str, Any]]] = None





def normalize_scheme(row: Dict[str, Any]) -> Dict[str, Any]:

    items = row.get("items")

    if not isinstance(items, list):

        items = []

    return {

        "id": row.get("id"),

        "name": row.get("name") or "",

        "category_id": row.get("category_id") or "",

        "category_name": row.get("category_name") or "",

        "remark": row.get("remark") or "",

        "items": items,

        "created_at": row.get("created_at"),

        "updated_at": row.get("updated_at")

    }





@app.get("/api/schemes")

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





@app.get("/api/schemes/{scheme_id}")

async def get_scheme(scheme_id: str):

    client = ensure_supabase()

    try:

        rows = await client.select("schemes", {"id": f"eq.{scheme_id}"})

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    if not rows:

        raise HTTPException(status_code=404, detail="?????")

    return {"scheme": normalize_scheme(rows[0])}





@app.post("/api/schemes")

async def create_scheme(payload: SchemeCreate):

    client = ensure_supabase()

    name = payload.name.strip()

    category_id = payload.category_id.strip()

    if not name:

        raise HTTPException(status_code=400, detail="????????")

    if not category_id:

        raise HTTPException(status_code=400, detail="??????")

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





@app.patch("/api/schemes/{scheme_id}")

async def update_scheme(scheme_id: str, payload: SchemeUpdate):

    client = ensure_supabase()

    updates: Dict[str, Any] = {}

    if payload.name is not None:

        name = payload.name.strip()

        if not name:

            raise HTTPException(status_code=400, detail="????????")

        updates["name"] = name

    if payload.category_id is not None:

        category_id = payload.category_id.strip()

        if not category_id:

            raise HTTPException(status_code=400, detail="??????")

        updates["category_id"] = category_id

    if payload.category_name is not None:

        updates["category_name"] = payload.category_name.strip() or None

    if payload.remark is not None:

        updates["remark"] = payload.remark.strip() or None

    if payload.items is not None:

        updates["items"] = payload.items

    if not updates:

        raise HTTPException(status_code=400, detail="?????????")

    updates["updated_at"] = utc_now_iso()

    try:

        record = await client.update("schemes", updates, {"id": f"eq.{scheme_id}"})

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    if not record:

        raise HTTPException(status_code=404, detail="?????")

    return {"scheme": normalize_scheme(record[0])}





@app.delete("/api/schemes/{scheme_id}")

async def delete_scheme(scheme_id: str):

    client = ensure_supabase()

    try:

        existing = await client.select("schemes", {"id": f"eq.{scheme_id}"})

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    if not existing:

        raise HTTPException(status_code=404, detail="?????")

    try:

        await client.delete("schemes", {"id": f"eq.{scheme_id}"})

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    return {"status": "ok"}





@app.get("/api/prompts")

async def get_prompt_templates(keys: Optional[str] = None):

    requested = [key.strip() for key in (keys or "").split(",") if key.strip()]

    if requested:

        templates: Dict[str, str] = {key: PROMPT_TEMPLATE_DEFAULTS.get(key, "") for key in requested}

    else:

        templates = dict(PROMPT_TEMPLATE_DEFAULTS)

    try:

        client = ensure_supabase()

        params = {"select": "key,content"}

        if requested:

            quoted = ",".join([f'"{key}"' for key in requested])

            params["key"] = f"in.({quoted})"

        rows = await client.select("prompt_templates", params=params)

        for row in rows:

            key = row.get("key")

            content = row.get("content")

            if key:

                templates[key] = content or ""

    except SupabaseError:

        pass

    except Exception:

        pass

    return {"templates": templates}





@app.patch("/api/prompts/{prompt_key}")

async def update_prompt_template(prompt_key: str, payload: PromptTemplateUpdate):

    if not prompt_key:

        raise HTTPException(status_code=400, detail="缺少提示词类型")

    client = ensure_supabase()

    body = {

        "key": prompt_key,

        "content": payload.content or "",

        "updated_at": utc_now_iso()

    }

    try:

        existing = await client.select("prompt_templates", {"key": f"eq.{prompt_key}"})

        if existing:

            record = await client.update("prompt_templates", body, {"key": f"eq.{prompt_key}"})

        else:

            record = await client.insert("prompt_templates", body)

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=f"提示词保存失败: {exc.message}")

    except Exception as exc:

        raise HTTPException(status_code=500, detail=f"提示词保存失败: {str(exc)}")

    return {"template": record[0] if record else body}





@app.post("/api/scheme/generate-text")

async def generate_scheme_text(payload: SchemeGenerateRequest):

    if not DEEPSEEK_API_KEY:

        raise HTTPException(status_code=500, detail="未配置 DeepSeek API 密钥")

    if not payload.items:

        raise HTTPException(status_code=400, detail="没有可用的选品数据")

    prompt_base = payload.prompt or PROMPT_TEMPLATE_DEFAULTS.get(payload.type, "")

    items_text = build_scheme_items_text(payload.items)

    if "{{items}}" in prompt_base:

        prompt_text = prompt_base.replace("{{items}}", items_text)

    else:

        prompt_text = f"{prompt_base}\n\n选品信息：\n{items_text}"

    try:

        async def request_text(model_name: str):

            return await asyncio.to_thread(

                deepseek_client.chat.completions.create,

                model=model_name,

                messages=[

                    {"role": "system", "content": "你是电商文案助手，输出清晰、简洁、可直接使用的结果。"},

                    {"role": "user", "content": prompt_text}

                ],

                temperature=0.3

            )



        model_in_use = DEEPSEEK_MODEL or "deepseek-chat"

        try:

            response = await request_text(model_in_use)

        except Exception as e:

            err = str(e)

            if "Model Not Exist" in err and model_in_use != "deepseek-chat":

                response = await request_text("deepseek-chat")

            else:

                raise

        result_text = response.choices[0].message.content.strip()

        if not result_text:

            raise HTTPException(status_code=500, detail="AI 未返回结果")

        return {"status": "success", "output": result_text}

    except HTTPException:

        raise

    except Exception as e:

        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")





def load_local_image_templates() -> List[Dict[str, Any]]:

    templates: List[Dict[str, Any]] = []

    if not LOCAL_IMAGE_TEMPLATE_DIR.exists():

        return templates

    for file_path in sorted(LOCAL_IMAGE_TEMPLATE_DIR.glob("*.html")):

        try:

            html = file_path.read_text(encoding="utf-8")

        except Exception:

            continue

        name = file_path.stem

        created_at = datetime.fromtimestamp(file_path.stat().st_mtime, tz=timezone.utc).isoformat()

        templates.append({

            "id": f"local-{file_path.stem}",

            "name": name,

            "category": "本地模板",

            "html": html,

            "preview_url": None,

            "created_at": created_at

        })

    return templates





@app.get("/api/image/templates")

async def get_image_templates():

    local_templates = load_local_image_templates()

    remote_templates: List[Dict[str, Any]] = []

    try:

        client = ensure_supabase()

        remote_templates = await client.select(

            "image_templates",

            params={

                "select": "id,name,category,html,preview_url,created_at",

                "order": "created_at.desc"

            }

        )

    except SupabaseError:

        remote_templates = []

    except Exception:

        remote_templates = []

    return {"templates": local_templates + (remote_templates or [])}





# ==================== 健康检查 ====================



# ---------- Supabase 持久化模块 ----------





class SourcingCategoryCreate(BaseModel):
    name: str
    color: Optional[str] = None
    spec_fields: Optional[List[Any]] = None
    sort_order: Optional[int] = None




class SourcingCategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    spec_fields: Optional[List[Any]] = None
    sort_order: Optional[int] = None




class SourcingItemCreate(BaseModel):

    category_id: str

    title: str

    link: Optional[str] = None

    taobao_link: Optional[str] = None

    price: Optional[float] = None

    commission: Optional[float] = None

    commission_rate: Optional[float] = None

    jd_price: Optional[float] = None

    jd_commission: Optional[float] = None

    jd_commission_rate: Optional[float] = None

    jd_sales: Optional[float] = None

    tb_price: Optional[float] = None

    tb_commission: Optional[float] = None

    tb_commission_rate: Optional[float] = None

    tb_sales: Optional[float] = None

    source_type: Optional[str] = "manual"

    source_ref: Optional[str] = None

    cover_url: Optional[str] = None

    remark: Optional[str] = None

    spec: Dict[str, Any] = Field(default_factory=dict)

    tags: Optional[List[str]] = None





class SourcingItemBatchItem(BaseModel):

    title: str

    link: Optional[str] = None

    taobao_link: Optional[str] = None

    price: Optional[float] = None

    commission: Optional[float] = None

    commission_rate: Optional[float] = None

    jd_price: Optional[float] = None

    jd_commission: Optional[float] = None

    jd_commission_rate: Optional[float] = None

    jd_sales: Optional[float] = None

    tb_price: Optional[float] = None

    tb_commission: Optional[float] = None

    tb_commission_rate: Optional[float] = None

    tb_sales: Optional[float] = None

    source_type: Optional[str] = "manual"

    source_ref: Optional[str] = None

    cover_url: Optional[str] = None

    remark: Optional[str] = None

    spec: Dict[str, Any] = Field(default_factory=dict)

    tags: Optional[List[str]] = None





class SourcingItemBatchCreate(BaseModel):

    category_id: str

    items: List[SourcingItemBatchItem]





class SourcingItemsByIdsRequest(BaseModel):

    ids: List[str] = Field(default_factory=list)




class SourcingItemUpdate(BaseModel):

    title: Optional[str] = None

    link: Optional[str] = None

    taobao_link: Optional[str] = None

    price: Optional[float] = None

    commission: Optional[float] = None

    commission_rate: Optional[float] = None

    jd_price: Optional[float] = None

    jd_commission: Optional[float] = None

    jd_commission_rate: Optional[float] = None

    jd_sales: Optional[float] = None

    tb_price: Optional[float] = None

    tb_commission: Optional[float] = None

    tb_commission_rate: Optional[float] = None

    tb_sales: Optional[float] = None

    source_type: Optional[str] = None

    source_ref: Optional[str] = None

    cover_url: Optional[str] = None

    remark: Optional[str] = None

    spec: Optional[Dict[str, Any]] = None

    tags: Optional[List[str]] = None



class AiFillRequest(BaseModel):
    category_id: str
    mode: str = Field(description="single | batch | selected")
    product_names: Optional[List[str]] = None
    model: Optional[str] = None


class AiConfirmRequest(BaseModel):
    category_id: str
    items: List[Dict[str, Any]]



class CommentAccountPayload(BaseModel):

    name: str
    homepage_link: Optional[str] = None





class CommentAccountUpdate(BaseModel):

    name: Optional[str] = None
    homepage_link: Optional[str] = None





class MyAccountSyncPayload(BaseModel):
    account_id: str

class ZhihuKeywordPayload(BaseModel):
    name: str

class ZhihuKeywordUpdate(BaseModel):
    name: Optional[str] = None





class CommentComboCreate(BaseModel):

    account_id: str


    name: str

    content: str

    remark: Optional[str] = None

    source_link: Optional[str] = None

    source_type: Optional[str] = None





class CommentComboUpdate(BaseModel):

    name: Optional[str] = None

    content: Optional[str] = None

    remark: Optional[str] = None

    source_link: Optional[str] = None

    source_type: Optional[str] = None






class BlueLinkMapCategoryCreate(BaseModel):

    account_id: str

    name: str

    color: Optional[str] = None





class BlueLinkMapCategoryUpdate(BaseModel):

    name: Optional[str] = None

    color: Optional[str] = None





class BlueLinkMapEntryCreate(BaseModel):

    account_id: str

    category_id: str

    source_link: str

    product_id: Optional[str] = None

    sku_id: Optional[str] = None
    remark: Optional[str] = None



    @validator("source_link")

    def normalize_source_link(cls, value: str) -> str:

        cleaned = (value or "").strip()

        if not cleaned:

            raise ValueError("蓝链不能为空")

        return cleaned





class BlueLinkMapEntryUpdate(BaseModel):

    category_id: Optional[str] = None

    source_link: Optional[str] = None

    product_id: Optional[str] = None

    sku_id: Optional[str] = None
    remark: Optional[str] = None



    @validator("source_link")

    def normalize_source_link(cls, value: Optional[str]) -> Optional[str]:

        if value is None:

            return value

        cleaned = value.strip()

        if not cleaned:

            raise ValueError("蓝链不能为空")

        return cleaned





class BlueLinkMapBatchPayload(BaseModel):

    entries: List[BlueLinkMapEntryCreate]


class BlueLinkMapClearPayload(BaseModel):

    account_id: str

    category_id: str





class BenchmarkCategoryPayload(BaseModel):

    name: str

    color: Optional[str] = None





class BenchmarkEntryPayload(BaseModel):

    category_id: str

    title: str

    link: Optional[str] = None

    bvid: Optional[str] = None

    cover: Optional[str] = None

    author: Optional[str] = None

    duration: Optional[int] = None

    pub_time: Optional[Any] = None

    note: Optional[str] = None

    owner: Optional[Dict[str, Any]] = None

    stats: Optional[Dict[str, Any]] = None

    payload: Optional[Dict[str, Any]] = None

    page: Optional[int] = 1





class BenchmarkEntryUpdate(BaseModel):

    title: Optional[str] = None

    link: Optional[str] = None

    bvid: Optional[str] = None

    cover: Optional[str] = None

    author: Optional[str] = None

    duration: Optional[int] = None

    pub_time: Optional[Any] = None

    note: Optional[str] = None

    owner: Optional[Dict[str, Any]] = None

    stats: Optional[Dict[str, Any]] = None

    payload: Optional[Dict[str, Any]] = None

    page: Optional[int] = None

    category_id: Optional[str] = None

    source_type: Optional[str] = None





def _sanitize_tags(value: Optional[List[Any]]) -> List[str]:

    if not value:

        return []

    return [str(item).strip() for item in value if str(item).strip()]





def normalize_sourcing_item(row: Dict[str, Any]) -> Dict[str, Any]:

    spec = row.get("spec")

    tags_raw = row.get("tags")

    if not isinstance(spec, dict):

        spec = {}

    if isinstance(tags_raw, list):

        tags = tags_raw

    elif isinstance(tags_raw, str):

        tags = [tags_raw]

    else:

        tags = []

    price = decimal_to_float(row.get("price"))
    commission = decimal_to_float(row.get("commission"))
    commission_rate = decimal_to_float(row.get("commission_rate"))
    jd_price = decimal_to_float(row.get("jd_price"))
    jd_commission = decimal_to_float(row.get("jd_commission"))
    jd_commission_rate = decimal_to_float(row.get("jd_commission_rate"))
    jd_sales = decimal_to_float(row.get("jd_sales"))
    tb_price = decimal_to_float(row.get("tb_price"))
    tb_commission = decimal_to_float(row.get("tb_commission"))
    tb_commission_rate = decimal_to_float(row.get("tb_commission_rate"))
    tb_sales = decimal_to_float(row.get("tb_sales"))
    if jd_price is None:
        jd_price = price
    if jd_commission is None:
        jd_commission = commission
    if jd_commission_rate is None:
        jd_commission_rate = commission_rate

    return {

        "id": row.get("id"),

        "category_id": row.get("category_id"),

        "uid": row.get("uid"),

        "title": row.get("title"),

        "link": row.get("link"),

        "taobao_link": row.get("taobao_link"),

        "price": price,

        "commission": commission,

        "commission_rate": commission_rate,

        "jd_price": jd_price,

        "jd_commission": jd_commission,

        "jd_commission_rate": jd_commission_rate,

        "jd_sales": jd_sales,

        "tb_price": tb_price,

        "tb_commission": tb_commission,

        "tb_commission_rate": tb_commission_rate,

        "tb_sales": tb_sales,

        "cover_url": row.get("cover_url"),

        "remark": row.get("remark"),

        "source_type": row.get("source_type"),

        "source_ref": row.get("source_ref"),

        "spec": spec,

        "tags": tags,

        "created_at": row.get("created_at"),

        "updated_at": row.get("updated_at"),

    }


async def sync_scheme_item_cover(
    client,
    item_id: str,
    cover_url: Optional[str],
) -> int:

    if not item_id:
        return 0

    try:
        schemes = await client.select("schemes", params={"select": "id,items"})
    except SupabaseError:
        return 0

    updated = 0
    for scheme in schemes or []:
        items = scheme.get("items")
        if not isinstance(items, list):
            continue
        changed = False
        for entry in items:
            if not isinstance(entry, dict):
                continue
            source_id = entry.get("source_id")
            entry_id = entry.get("id")
            if (source_id is not None and str(source_id) == str(item_id)) or (
                entry_id is not None and str(entry_id) == str(item_id)
            ):
                if entry.get("cover_url") != cover_url:
                    entry["cover_url"] = cover_url
                changed = True
        if not changed:
            continue
        try:
            await client.update(
                "schemes",
                {"items": items, "updated_at": utc_now_iso()},
                {"id": f"eq.{scheme.get('id')}"},
            )
            updated += 1
        except SupabaseError:
            continue

    return updated


SCHEME_SYNC_FIELDS = (
    "title",
    "link",
    "price",
    "commission",
    "commission_rate",
    "jd_price",
    "jd_commission",
    "jd_commission_rate",
    "jd_sales",
    "tb_price",
    "tb_commission",
    "tb_commission_rate",
    "tb_sales",
    "cover_url",
    "remark",
    "spec",
    "uid",
)


async def sync_scheme_item_fields(
    client,
    item_id: str,
    updated_item: Dict[str, Any],
    fields: Optional[List[str]] = None,
) -> int:

    if not item_id or not isinstance(updated_item, dict):
        return 0

    use_fields = fields or list(SCHEME_SYNC_FIELDS)
    payload = {field: updated_item.get(field) for field in use_fields}

    if "spec" in payload and not isinstance(payload.get("spec"), dict):
        payload["spec"] = {}

    try:
        schemes = await client.select("schemes", params={"select": "id,items"})
    except SupabaseError:
        return 0

    updated = 0
    for scheme in schemes or []:
        items = scheme.get("items")
        if not isinstance(items, list):
            continue
        changed = False
        for entry in items:
            if not isinstance(entry, dict):
                continue
            source_id = entry.get("source_id")
            entry_id = entry.get("id")
            if (source_id is not None and str(source_id) == str(item_id)) or (
                entry_id is not None and str(entry_id) == str(item_id)
            ):
                for key, value in payload.items():
                    if entry.get(key) != value:
                        entry[key] = value
                        changed = True
        if not changed:
            continue
        try:
            await client.update(
                "schemes",
                {"items": items, "updated_at": utc_now_iso()},
                {"id": f"eq.{scheme.get('id')}"},
            )
            updated += 1
        except SupabaseError:
            continue

    return updated




def normalize_spec_fields(spec_fields: Any) -> List[Dict[str, str]]:
    if not isinstance(spec_fields, list):
        return []
    normalized: List[Dict[str, str]] = []
    seen: Set[str] = set()
    for field in spec_fields:
        key = ""
        value = ""
        example = ""
        if isinstance(field, dict):
            key = str(field.get("key") or field.get("name") or "").strip()
            value = str(field.get("value") or "").strip()
            example = str(field.get("example") or "").strip()
        else:
            key = str(field or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        result = {"key": key, "value": value}
        if example:
            result["example"] = example
        normalized.append(result)
    return normalized


def normalize_sourcing_category(row: Dict[str, Any], spec_fields: Optional[List[Any]] = None, count: Optional[int] = 0) -> Dict[str, Any]:
    if spec_fields is None:
        spec_fields = row.get("spec_fields")
    spec_fields = normalize_spec_fields(spec_fields)
    return {
        "id": row.get("id"),
        "name": row.get("name"),
        "color": row.get("color"),
        "uid_prefix": row.get("uid_prefix"),
        "uid_counter": row.get("uid_counter") or 0,
        "item_count": count,
        "sort_order": row.get("sort_order"),
        "spec_fields": spec_fields,
        "created_at": row.get("created_at"),

        "updated_at": row.get("updated_at"),

    }


async def ai_fill_product_params(
    category_name: str,
    spec_fields: List[Dict[str, Any]],
    product_names: List[str],
    model_override: Optional[str] = None
) -> List[Dict[str, str]]:
    """
    调用千问联网搜索获取商品参数

    Args:
        category_name: 品类名称
        spec_fields: 预设参数字段列表，每项包含 key 和 example
        product_names: 商品名称列表

    Returns:
        商品参数列表，每个元素包含 name 和各字段值
    """
    DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY")
    if not DASHSCOPE_API_KEY:
        raise HTTPException(status_code=500, detail="DASHSCOPE_API_KEY 未配置")

    if not spec_fields:
        raise HTTPException(status_code=400, detail="预设字段为空")
    if not product_names:
        raise HTTPException(status_code=400, detail="商品列表为空")

    # 构建带格式示例的 prompt
    field_descriptions = []
    for field in spec_fields:
        key = field.get("key", "")
        example = field.get("example", "")
        if example:
            field_descriptions.append(f"{key}(格式:{example})")
        else:
            field_descriptions.append(key)

    fields_str = "、".join(field_descriptions)
    products_str = "\n".join(f"- {p}" for p in product_names)

    # 提取纯字段名用于返回格式
    field_keys = [f.get("key", "") for f in spec_fields if f.get("key")]

    prompt = f"""你是商品参数提取助手。请联网搜索以下商品的参数信息。

品类：{category_name}
预设字段：{fields_str}

商品列表：
{products_str}

要求：
1. 严格返回JSON数组，不要markdown代码块，不要任何解释
2. 只使用预设字段，不要添加新字段
3. 参数值要简洁，按照格式示例的格式返回，如未知用空字符串""

返回格式：
[{{"name":"商品1","{field_keys[0]}":"值1","{field_keys[1]}":"值1"}},...]"""

    response = Generation.call(
        api_key=DASHSCOPE_API_KEY,
        model=model_override or "qwen3-max-2026-01-23",
        enable_search=True,
        search_options={"forced_search": True},
        prompt=prompt,
        result_format="message"
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail=f"AI调用失败: {response.message}"
        )

    # 解析 JSON
    import json
    content = response.output.choices[0]['message']['content']

    # 清理可能的 markdown 代码块
    content = content.strip()
    if content.startswith("```"):
        parts = content.split("```")
        if len(parts) >= 2:
            content = parts[1]
            if content.startswith("json"):
                content = content[4:]
        else:
            content = content[3:]

    content = content.strip()

    try:
        result = json.loads(content)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI返回的不是有效JSON: {content[:200]}..."
        )

    if not isinstance(result, list):
        raise HTTPException(
            status_code=500,
            detail=f"AI返回格式错误，应为数组"
        )

    # 验证返回数据结构
    for item in result:
        if not isinstance(item, dict) or "name" not in item:
            raise HTTPException(
                status_code=500,
                detail=f"AI返回项缺少name字段: {item}"
            )
        # 确保只包含预设字段
        for key in list(item.keys()):
            if key not in field_keys + ["name"]:
                del item[key]

    return result





def normalize_comment_account(row: Dict[str, Any]) -> Dict[str, Any]:

    return {

        "id": row.get("id"),

        "name": row.get("name"),
        "homepage_link": row.get("homepage_link"),

        "created_at": row.get("created_at")

    }





def normalize_comment_combo(row: Dict[str, Any]) -> Dict[str, Any]:

    return {

        "id": row.get("id"),

        "account_id": row.get("account_id"),


        "name": row.get("name"),

        "content": row.get("content"),

        "remark": row.get("remark"),

        "source_link": row.get("source_link"),

        "source_type": row.get("source_type"),

        "created_at": row.get("created_at"),

        "updated_at": row.get("updated_at"),

    }


def normalize_account_video(row: Dict[str, Any]) -> Dict[str, Any]:
    payload = row.get("payload") if isinstance(row.get("payload"), dict) else {}
    raw_stats = row.get("stats")
    stats = raw_stats if isinstance(raw_stats, dict) else {}
    if stats.get("danmaku") in (None, ""):
        fallback = parse_bili_count(payload.get("video_review"))
        if fallback is not None:
            stats["danmaku"] = fallback
    if not stats:
        stats = None
    return {
        "id": row.get("id"),
        "account_id": row.get("account_id"),
        "bvid": row.get("bvid"),
        "title": row.get("title"),
        "link": row.get("link"),
        "cover": row.get("cover"),
        "author": row.get("author"),
        "duration": row.get("duration"),
        "pub_time": row.get("pub_time"),
        "stats": stats,
        "payload": payload if payload else row.get("payload"),
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }





def normalize_blue_link_map_category(row: Dict[str, Any]) -> Dict[str, Any]:

    return {

        "id": row.get("id"),

        "account_id": row.get("account_id"),

        "name": row.get("name"),

        "color": row.get("color"),

        "created_at": row.get("created_at"),

        "updated_at": row.get("updated_at"),

    }





def normalize_blue_link_map_entry(row: Dict[str, Any]) -> Dict[str, Any]:

    return {

        "id": row.get("id"),

        "account_id": row.get("account_id"),

        "category_id": row.get("category_id"),

        "product_id": row.get("product_id"),

        "sku_id": row.get("sku_id"),

        "source_link": row.get("source_link"),
        "remark": row.get("remark"),

        "created_at": row.get("created_at"),

        "updated_at": row.get("updated_at"),

    }





def normalize_benchmark_entry(row: Dict[str, Any]) -> Dict[str, Any]:

    owner = row.get("owner") if isinstance(row.get("owner"), dict) else {}

    stats = row.get("stats") if isinstance(row.get("stats"), dict) else {}

    payload = row.get("payload") if isinstance(row.get("payload"), dict) else {}

    return {

        "id": row.get("id"),

        "category_id": row.get("category_id"),

        "title": row.get("title"),

        "link": row.get("link"),

        "bvid": row.get("bvid"),

        "cover": row.get("cover"),

        "author": row.get("author"),

        "duration": row.get("duration"),

        "pub_time": row.get("pub_time"),

        "note": row.get("note"),

        "owner": owner,

        "stats": stats,

        "payload": payload,

        "page": row.get("page"),

        "subtitle_text": row.get("subtitle_text"),

        "subtitle_source": row.get("subtitle_source"),

        "created_at": row.get("created_at"),

        "updated_at": row.get("updated_at"),

    }





SOURCING_LIST_FIELDS = ",".join([

    "id",

    "category_id",

    "uid",

    "title",

    "price",

    "commission",

    "commission_rate",

    "jd_price",

    "jd_commission",

    "jd_commission_rate",

    "jd_sales",

    "tb_price",

    "tb_commission",

    "tb_commission_rate",

    "tb_sales",

    "link",

    "taobao_link",

    "remark",

    "source_type",

    "source_ref",

    "cover_url",

    "spec",

    "created_at",

    "updated_at",

])





async def fetch_sourcing_categories(include_counts: bool = True) -> List[Dict[str, Any]]:

    client = ensure_supabase()

    try:
        categories = await client.select(
            "sourcing_categories",
            params={"order": "sort_order.asc.nullslast,created_at.asc"}
        )
    except SupabaseError as exc:
        if "sort_order" in str(exc.message):
            categories = await client.select("sourcing_categories", params={"order": "created_at.asc"})
        else:
            raise

    counts: Optional[Dict[str, int]] = None

    if include_counts and categories:

        counts = {}

        rows = await client.select("sourcing_items", params={"select": "category_id"})

        for row in rows:

            category_id = row.get("category_id")

            if not category_id:

                continue

            counts[category_id] = counts.get(category_id, 0) + 1

    normalized: List[Dict[str, Any]] = []

    for cat in categories:

        spec_fields = cat.get("spec_fields")

        if not isinstance(spec_fields, list):

            spec_fields = []

        count = counts.get(cat.get("id")) if counts is not None else None

        normalized.append(normalize_sourcing_category(cat, spec_fields, count))

    return normalized


async def fetch_sourcing_category_counts(force: bool = False) -> Dict[str, Any]:
    now = time.time()
    cached = SOURCING_CATEGORY_COUNT_CACHE.get("data")
    if not force and cached and now - SOURCING_CATEGORY_COUNT_CACHE.get("timestamp", 0.0) < SOURCING_CATEGORY_COUNT_TTL_SECONDS:
        return cached
    client = ensure_supabase()
    counts: Dict[str, int] = {}
    categories = await client.select("sourcing_categories", params={"select": "id"})
    rows = await client.select("sourcing_items", params={"select": "category_id"})
    for row in rows:
        category_id = row.get("category_id")
        if not category_id:
            continue
        counts[category_id] = counts.get(category_id, 0) + 1
    for category in categories:
        category_id = category.get("id")
        if not category_id:
            continue
        counts.setdefault(category_id, 0)
    payload = {"counts": counts}
    SOURCING_CATEGORY_COUNT_CACHE["timestamp"] = now
    SOURCING_CATEGORY_COUNT_CACHE["data"] = payload
    return payload





async def fetch_sourcing_items_page(

    *,

    category_id: Optional[str] = None,

    limit: int = 50,

    offset: int = 0,

    keyword: Optional[str] = None,

    fields: str = "list",
    sort: Optional[str] = None,

) -> Dict[str, Any]:

    limit = max(1, min(int(limit or 50), 200))

    offset = max(0, int(offset or 0))

    sort_key = (sort or "").strip()
    cache_key = (category_id or "", keyword or "", limit, offset, fields, sort_key)

    now = time.time()

    cached = SOURCING_ITEMS_CACHE.get(cache_key)

    if cached and now - cached["timestamp"] < CACHE_TTL_SECONDS:

        return cached["data"]

    client = ensure_supabase()

    sort_value = sort_key.lower()
    order_value = "created_at.desc"
    if sort_value == "manual":
        order_value = "spec->>_sort_order.asc.nullslast,created_at.desc"

    params: Dict[str, Any] = {

        "order": order_value,

        "limit": limit + 1,

        "offset": offset,

    }

    if category_id:

        params["category_id"] = f"eq.{category_id}"

    if keyword:

        safe_keyword = keyword.replace("%", "").replace("*", "").strip()

        if safe_keyword:

            params["or"] = f"(title.ilike.*{safe_keyword}*,uid.ilike.*{safe_keyword}*)"

    if fields == "detail":

        params["select"] = "*"

    else:

        params["select"] = SOURCING_LIST_FIELDS

    rows = await client.select("sourcing_items", params=params)

    has_more = len(rows) > limit

    items = rows[:limit] if has_more else rows

    payload = {

        "items": items,

        "offset": offset,

        "limit": limit,

        "has_more": has_more,

        "next_offset": offset + len(items)

    }

    SOURCING_ITEMS_CACHE[cache_key] = {"timestamp": now, "data": payload}

    if len(SOURCING_ITEMS_CACHE) > SOURCING_ITEMS_CACHE_LIMIT:

        oldest_key = min(SOURCING_ITEMS_CACHE.items(), key=lambda item: item[1]["timestamp"])[0]

        SOURCING_ITEMS_CACHE.pop(oldest_key, None)

    return payload





async def fetch_sourcing_snapshot() -> Dict[str, Any]:

    client = ensure_supabase()

    categories = await fetch_sourcing_categories(include_counts=True)

    items_page = await fetch_sourcing_items_page(fields="detail", limit=200, offset=0)

    return {"categories": categories, "items": items_page["items"]}





async def fetch_comment_snapshot() -> Dict[str, Any]:

    client = ensure_supabase()

    accounts = await client.select("comment_accounts", params={"order": "created_at.asc"})


    combos = await client.select("comment_combos", params={"order": "updated_at.desc"})

    return {

        "accounts": [normalize_comment_account(item) for item in accounts],


        "combos": [normalize_comment_combo(item) for item in combos],

    }





async def fetch_blue_link_map_snapshot(product_ids: Optional[List[str]] = None) -> Dict[str, Any]:

    now = time.time()

    use_cache = not product_ids
    cached = BLUE_LINK_MAP_CACHE.get("data")

    if use_cache and cached and now - BLUE_LINK_MAP_CACHE.get("timestamp", 0.0) < BLUE_LINK_MAP_CACHE_TTL_SECONDS:

        return cached

    client = ensure_supabase()

    cleaned_ids = [str(pid).strip() for pid in (product_ids or []) if str(pid).strip()]
    entries_params = {
        "order": "updated_at.desc",
        "select": "id,account_id,category_id,product_id,sku_id,source_link,remark,created_at,updated_at"
    }
    if cleaned_ids:
        entries_params["product_id"] = f"in.({','.join(cleaned_ids)})"

    entries_task = client.select("blue_link_map_entries", params=entries_params)

    accounts, categories, entries = await asyncio.gather(
        client.select(
            "comment_accounts",
            params={
                "order": "created_at.asc",
                "select": "id,name,created_at"
            }
        ),
        client.select(
            "blue_link_map_categories",
            params={
                "order": "created_at.asc",
                "select": "id,account_id,name,color,created_at"
            }
        ),
        entries_task,
    )

    payload = {

        "accounts": [normalize_comment_account(item) for item in accounts],

        "categories": [normalize_blue_link_map_category(item) for item in categories],

        "entries": [normalize_blue_link_map_entry(item) for item in entries],

    }

    if use_cache:
        BLUE_LINK_MAP_CACHE["timestamp"] = now
        BLUE_LINK_MAP_CACHE["data"] = payload

    return payload





async def fetch_benchmark_snapshot(mode: str = "full") -> Dict[str, Any]:

    client = ensure_supabase()

    categories = await client.select("benchmark_categories", params={"order": "created_at.asc"})

    normalized_categories = [

        {"id": cat.get("id"), "name": cat.get("name"), "color": cat.get("color"), "created_at": cat.get("created_at")}

        for cat in categories

    ]

    if mode == "pick":

        entries = await client.select(

            "benchmark_entries",

            params={

                "order": "created_at.desc",

                "select": "id,category_id,title,link,author"

            }

        )

        return {"categories": normalized_categories, "entries": entries}

    entries = await client.select("benchmark_entries", params={"order": "created_at.desc"})

    return {

        "categories": normalized_categories,

        "entries": [normalize_benchmark_entry(item) for item in entries]

    }





@app.get("/api/sourcing/overview")

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





@app.get("/api/sourcing/categories")

async def list_sourcing_categories(include_counts: bool = True):

    categories = await fetch_sourcing_categories(include_counts=include_counts)

    return {"categories": categories}



@app.get("/api/sourcing/categories/counts")

async def list_sourcing_category_counts(force: bool = False):

    return await fetch_sourcing_category_counts(force=force)





@app.get("/api/sourcing/items")

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





@app.get("/api/sourcing/items/{item_id}")

async def get_sourcing_item(item_id: str):

    client = ensure_supabase()

    rows = await client.select("sourcing_items", {"id": f"eq.{item_id}"})

    if not rows:

        raise HTTPException(status_code=404, detail="选品不存在")

    return {"item": normalize_sourcing_item(rows[0])}





@app.post("/api/sourcing/items/by-ids")

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



@app.post("/api/sourcing/categories")

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





@app.patch("/api/sourcing/categories/{category_id}")

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





@app.delete("/api/sourcing/categories/{category_id}")

async def delete_sourcing_category(category_id: str):

    client = ensure_supabase()

    existing = await client.select("sourcing_categories", {"id": f"eq.{category_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="分类不存在")

    await client.delete("sourcing_items", {"category_id": f"eq.{category_id}"})

    await client.delete("sourcing_categories", {"id": f"eq.{category_id}"})

    return {"status": "ok"}





@app.post("/api/sourcing/items")

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





@app.post("/api/sourcing/items/batch")

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


@app.post("/api/sourcing/items/ai-fill")

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


@app.post("/api/sourcing/items/ai-confirm")

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

        # 构建 spec 更新数据
        spec: Dict[str, Any] = {}

        # 只更新预设字段
        for field in spec_fields:
            value = item_data.get(field, "")
            if value:
                spec[field] = value

        # 获取现有 spec 并合并
        existing_spec = existing_item.get("spec") or {}
        merged_spec = {**existing_spec, **spec}

        # 更新商品
        await client.update(
            "sourcing_items",
            {
                "spec": normalize_spec_payload(merged_spec),
                "updated_at": utc_now_iso()
            },
            {"id": f"eq.{item_id}"}
        )

        updated_count += 1

    return {
        "status": "ok",
        "updated_count": updated_count,
        "not_found_count": not_found_count
    }





@app.patch("/api/sourcing/items/{item_id}")

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





@app.post("/api/sourcing/covers")

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





async def delete_old_cover(cover_url: str):
    """从 Supabase Storage 删除旧的封面图"""

    if not cover_url or not cover_url.startswith(SUPABASE_URL):

        return

    try:

        # 从 URL 中提取文件路径
        # URL 格式: https://caniczldtzpkqajgmsdw.supabase.co/storage/v1/object/public/sourcing-covers/filename.jpg
        path_match = cover_url.split("/storage/v1/object/public/")[-1]

        if not path_match:

            return

        # 构造删除 API URL
        delete_url = f"{SUPABASE_URL.rstrip('/')}/storage/v1/object/{path_match}"

        headers = {

            "apikey": SUPABASE_SERVICE_ROLE_KEY,

            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"

        }

        async with httpx.AsyncClient() as http_client:

            await http_client.delete(delete_url, headers=headers)

    except Exception as exc:

        # 删除失败不影响主流程，只记录日志

        print(f"删除旧封面失败: {exc}")





@app.post("/api/sourcing/batch-cover")

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






@app.delete("/api/sourcing/items/{item_id}")

async def delete_sourcing_item(item_id: str):

    client = ensure_supabase()

    existing = await client.select("sourcing_items", {"id": f"eq.{item_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="选品不存在")

    await client.delete("sourcing_items", {"id": f"eq.{item_id}"})

    return {"status": "ok"}





@app.get("/api/comment/blue-links/state-v2")

async def get_comment_blue_link_state():

    return await fetch_comment_snapshot()





@app.post("/api/comment/accounts")

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





@app.patch("/api/comment/accounts/{account_id}")

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





@app.delete("/api/comment/accounts/{account_id}")

async def delete_comment_account(account_id: str):

    client = ensure_supabase()

    existing = await client.select("comment_accounts", {"id": f"eq.{account_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="账号不存在")

    await client.delete("comment_combos", {"account_id": f"eq.{account_id}"})


    await client.delete("comment_accounts", {"id": f"eq.{account_id}"})

    return {"status": "ok"}


@app.get("/api/my-accounts/state")
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


ACCOUNT_VIDEO_STAT_CONCURRENCY = 6


@app.get("/api/my-accounts/video-counts")
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


async def sync_account_videos_for_account(
    client: SupabaseClient,
    account_id: str,
    homepage_link: str,
) -> Tuple[int, int, int]:
    mid = extract_mid_from_homepage_link(homepage_link)
    if not mid:
        raise HTTPException(status_code=400, detail="请先填写正确的账号主页链接")

    vlist = await fetch_account_videos_from_bili(mid)
    total_videos = len(vlist)
    existing_rows = await client.select(
        "account_videos",
        params={"select": "bvid", "account_id": f"eq.{account_id}"},
    )
    existing_set = {row.get("bvid") for row in existing_rows if row.get("bvid")}

    rows: List[Dict[str, Any]] = []
    added = 0
    updated = 0
    semaphore = asyncio.Semaphore(ACCOUNT_VIDEO_STAT_CONCURRENCY)

    async def build_row(item: Dict[str, Any], session: aiohttp.ClientSession):
        bvid = str(item.get("bvid") or item.get("bvid_str") or "").strip()
        if not bvid:
            return None
        async with semaphore:
            stat = await fetch_account_video_stat(bvid, session=session)
        return build_account_video_payload(account_id, item, stat)

    async with aiohttp.ClientSession() as session:
        results = await asyncio.gather(
            *(build_row(item, session) for item in vlist),
            return_exceptions=False,
        )

    for payload_row in results:
        if not payload_row:
            continue
        if payload_row["bvid"] in existing_set:
            updated += 1
        else:
            added += 1
        rows.append(payload_row)

    if rows:
        await client.upsert("account_videos", rows, on_conflict="account_id,bvid")

    return added, updated, total_videos


@app.post("/api/my-accounts/sync")
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


@app.post("/api/my-accounts/sync-all")
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





@app.get("/api/zhihu/keywords")
async def list_zhihu_keywords():
    client = ensure_supabase()
    rows = await client.select("zhihu_keywords", params={"order": "created_at.asc"})
    return {"keywords": rows}


@app.post("/api/zhihu/keywords")
async def create_zhihu_keyword(payload: ZhihuKeywordPayload):
    client = ensure_supabase()
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="???????")
    body = {"name": name, "created_at": utc_now_iso(), "updated_at": utc_now_iso()}
    try:
        record = await client.insert("zhihu_keywords", body)
    except SupabaseError as exc:
        status = 400 if exc.status_code in (400, 409) else 500
        raise HTTPException(status_code=status, detail=str(exc.message))
    return {"keyword": record[0]}


@app.patch("/api/zhihu/keywords/{keyword_id}")
async def update_zhihu_keyword(keyword_id: str, payload: ZhihuKeywordUpdate):
    client = ensure_supabase()
    updates: Dict[str, Any] = {}
    if payload.name is not None:
        if not payload.name.strip():
            raise HTTPException(status_code=400, detail="???????")
        updates["name"] = payload.name.strip()
    if not updates:
        return {"keyword": None}
    updates["updated_at"] = utc_now_iso()
    record = await client.update("zhihu_keywords", updates, {"id": f"eq.{keyword_id}"})
    if not record:
        raise HTTPException(status_code=404, detail="??????")
    return {"keyword": record[0]}


@app.delete("/api/zhihu/keywords/{keyword_id}")
async def delete_zhihu_keyword(keyword_id: str):
    client = ensure_supabase()
    existing = await client.select("zhihu_keywords", {"id": f"eq.{keyword_id}"})
    if not existing:
        raise HTTPException(status_code=404, detail="??????")
    await client.delete("zhihu_question_keywords", {"keyword_id": f"eq.{keyword_id}"})
    await client.delete("zhihu_keywords", {"id": f"eq.{keyword_id}"})
    await client.update("zhihu_questions", {"first_keyword_id": None}, {"first_keyword_id": f"eq.{keyword_id}"})
    return {"status": "ok"}


@app.get("/api/zhihu/questions")
async def list_zhihu_questions(keyword_id: Optional[str] = None, q: Optional[str] = None, limit: int = 50, offset: int = 0):
    client = ensure_supabase()
    params = {"select": "id,title,url,first_keyword_id,created_at,updated_at,last_seen_at", "order": "updated_at.desc", "limit": limit, "offset": offset}
    if q:
        safe_q = q.replace("%", "").replace("*", "").strip()
        if safe_q:
            params["title"] = f"ilike.*{safe_q}*"
    if keyword_id:
        mapping = await client.select("zhihu_question_keywords", {"keyword_id": f"eq.{keyword_id}", "select": "question_id"})
        ids = [row.get("question_id") for row in mapping if row.get("question_id")]
        if not ids:
            return {"items": [], "total": 0}
        params["id"] = f"in.({','.join(ids)})"
    questions = await client.select("zhihu_questions", params)

    today = shanghai_today()
    yesterday = today - timedelta(days=1)
    ids = [row.get("id") for row in questions]
    stats_today = await client.select("zhihu_question_stats", {"question_id": f"in.({','.join(ids)})", "stat_date": f"eq.{today}", "select": "question_id,view_count,answer_count"}) if ids else []
    stats_yesterday = await client.select("zhihu_question_stats", {"question_id": f"in.({','.join(ids)})", "stat_date": f"eq.{yesterday}", "select": "question_id,view_count,answer_count"}) if ids else []

    today_map = {row["question_id"]: row for row in stats_today}
    yesterday_map = {row["question_id"]: row for row in stats_yesterday}
    keyword_map = await fetch_zhihu_keywords_map(client)

    items = []
    for row in questions:
        qid = row.get("id")
        today_row = today_map.get(qid, {})
        yesterday_row = yesterday_map.get(qid, {})
        view_total = int(today_row.get("view_count") or 0)
        answer_total = int(today_row.get("answer_count") or 0)
        view_delta = view_total - int(yesterday_row.get("view_count") or 0)
        answer_delta = answer_total - int(yesterday_row.get("answer_count") or 0)
        items.append({**row, "first_keyword": keyword_map.get(str(row.get("first_keyword_id")) or "", "???"), "view_count_total": view_total, "answer_count_total": answer_total, "view_count_delta": view_delta, "answer_count_delta": answer_delta})
    return {"items": items, "total": len(items)}


@app.get("/api/zhihu/questions/{question_id}/stats")
async def get_zhihu_question_stats(question_id: str, days: int = 15):
    client = ensure_supabase()
    rows = await client.select("zhihu_question_stats", {"question_id": f"eq.{question_id}", "order": "stat_date.asc", "limit": days})
    return {"stats": rows}


@app.post("/api/zhihu/scrape/run")
async def run_zhihu_scrape():
    asyncio.create_task(zhihu_scrape_job())
    return {"status": "started"}


@app.post("/api/comment/combos")

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





@app.patch("/api/comment/combos/{combo_id}")

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





@app.delete("/api/comment/combos/{combo_id}")

async def delete_comment_combo(combo_id: str):

    client = ensure_supabase()

    existing = await client.select("comment_combos", {"id": f"eq.{combo_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="蓝链组合不存在")

    await client.delete("comment_combos", {"id": f"eq.{combo_id}"})

    return {"status": "ok"}





@app.get("/api/blue-link-map/state-v2")

async def get_blue_link_map_state(product_ids: Optional[str] = None):

    ids = [pid.strip() for pid in (product_ids or "").split(",") if pid and pid.strip()]
    return await fetch_blue_link_map_snapshot(ids if ids else None)





@app.post("/api/blue-link-map/categories")

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





@app.patch("/api/blue-link-map/categories/{category_id}")

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





@app.delete("/api/blue-link-map/categories/{category_id}")

async def delete_blue_link_map_category(category_id: str):

    client = ensure_supabase()

    existing = await client.select("blue_link_map_categories", {"id": f"eq.{category_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="分类不存在")

    await client.delete("blue_link_map_entries", {"category_id": f"eq.{category_id}"})

    await client.delete("blue_link_map_categories", {"id": f"eq.{category_id}"})

    return {"status": "ok"}





@app.post("/api/blue-link-map/entries/batch")

async def batch_upsert_blue_link_map_entries(payload: BlueLinkMapBatchPayload):

    client = ensure_supabase()

    if not payload.entries:

        raise HTTPException(status_code=400, detail="没有可导入的蓝链")

    now = utc_now_iso()

    matched: Dict[Tuple[str, str], Dict[str, Any]] = {}

    unmatched: List[Dict[str, Any]] = []

    for entry in payload.entries:

        record = {

            "account_id": entry.account_id,

            "category_id": entry.category_id,

            "product_id": entry.product_id,

            "sku_id": entry.sku_id,

            "source_link": entry.source_link,
            "remark": (entry.remark or "").strip() or None,

            "updated_at": now,

        }

        if entry.product_id:

            matched[(entry.account_id, entry.product_id)] = record

        else:

            unmatched.append({**record, "created_at": now})

    results: List[Dict[str, Any]] = []

    if matched:

        try:

            upserted = await client.upsert(

                "blue_link_map_entries",

                list(matched.values()),

                on_conflict="account_id,product_id"

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

    BLUE_LINK_MAP_CACHE["timestamp"] = 0.0
    BLUE_LINK_MAP_CACHE["data"] = None
    return {"entries": [normalize_blue_link_map_entry(item) for item in results]}





@app.post("/api/blue-link-map/entries/clear")
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
    BLUE_LINK_MAP_CACHE["timestamp"] = 0.0
    BLUE_LINK_MAP_CACHE["data"] = None
    return {"status": "ok"}


@app.patch("/api/blue-link-map/entries/{entry_id}")

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

        updates["source_link"] = payload.source_link

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
            "remark": updates.get("remark", existing.get("remark")),

            "updated_at": updates["updated_at"],

        }

        try:

            merged = await client.upsert(

                "blue_link_map_entries",

                payload_record,

                on_conflict="account_id,product_id"

            )

        except SupabaseError as exc:

            raise HTTPException(status_code=500, detail=str(exc.message))

        if not merged:

            raise HTTPException(status_code=500, detail="更新失败")

        merged_entry = merged[0]

        if merged_entry.get("id") != entry_id:

            await client.delete("blue_link_map_entries", {"id": f"eq.{entry_id}"})

        BLUE_LINK_MAP_CACHE["timestamp"] = 0.0
        BLUE_LINK_MAP_CACHE["data"] = None
        return {"entry": normalize_blue_link_map_entry(merged_entry)}



    try:

        record = await client.update("blue_link_map_entries", updates, {"id": f"eq.{entry_id}"})

    except SupabaseError as exc:

        raise HTTPException(status_code=500, detail=str(exc.message))

    if not record:

        raise HTTPException(status_code=404, detail="映射不存在")

    BLUE_LINK_MAP_CACHE["timestamp"] = 0.0
    BLUE_LINK_MAP_CACHE["data"] = None
    return {"entry": normalize_blue_link_map_entry(record[0])}





@app.delete("/api/blue-link-map/entries/{entry_id}")

async def delete_blue_link_map_entry(entry_id: str):

    client = ensure_supabase()

    existing = await client.select("blue_link_map_entries", {"id": f"eq.{entry_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="映射不存在")

    await client.delete("blue_link_map_entries", {"id": f"eq.{entry_id}"})

    BLUE_LINK_MAP_CACHE["timestamp"] = 0.0
    BLUE_LINK_MAP_CACHE["data"] = None
    return {"status": "ok"}





@app.get("/api/benchmark/state")

async def get_benchmark_state(mode: str = Query("full")):

    return await fetch_benchmark_snapshot(mode)





@app.post("/api/benchmark/categories")

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





@app.delete("/api/benchmark/categories/{category_id}")

async def delete_benchmark_category(category_id: str):

    client = ensure_supabase()

    existing = await client.select("benchmark_categories", {"id": f"eq.{category_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="分类不存在")

    await client.delete("benchmark_entries", {"category_id": f"eq.{category_id}"})

    await client.delete("benchmark_categories", {"id": f"eq.{category_id}"})

    return {"status": "ok"}





def _normalize_pub_time(value: Optional[Any]) -> Optional[str]:

    if value is None:

        return None

    if isinstance(value, (int, float)):

        return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()

    if isinstance(value, str):

        return value

    return None





@app.post("/api/benchmark/entries")

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





@app.patch("/api/benchmark/entries/{entry_id}")

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





@app.delete("/api/benchmark/entries/{entry_id}")

async def delete_benchmark_entry(entry_id: str):

    client = ensure_supabase()

    existing = await client.select("benchmark_entries", {"id": f"eq.{entry_id}"})

    if not existing:

        raise HTTPException(status_code=404, detail="对标记录不存在")

    await client.delete("benchmark_entries", {"id": f"eq.{entry_id}"})

    return {"status": "ok"}





@app.get("/api/health")

async def health_check():

    """健康检查"""

    return {

        "status": "ok",

        "services": {

            "deepseek": bool(DEEPSEEK_API_KEY),

            "dashscope": bool(DASHSCOPE_API_KEY),

            "rembg": rembg_session is not None

        }

    }





if __name__ == "__main__":

    import uvicorn

    from datetime import datetime

    print("=" * 60)

    print(f"[B站电商工作台] 后端启动")

    print(f"[版本] v2.2 - 添加淘宝商品标题获取API (2025-01-07)")

    print(f"[时间] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    print("=" * 60)

    backend_port = int(os.getenv("BACKEND_PORT", os.getenv("PORT", "8000")))

    uvicorn.run(app, host="127.0.0.1", port=backend_port)


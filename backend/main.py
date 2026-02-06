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
import html
import threading

from datetime import datetime, timezone, date, timedelta

from decimal import Decimal, InvalidOperation

from pathlib import Path

from typing import List, Optional, Dict, Any, Tuple, Set, Literal, Callable, Awaitable
from uuid import uuid4

from urllib.parse import urlencode, urlparse, parse_qs, quote, unquote

from zoneinfo import ZoneInfo



import aiohttp
import httpx

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


# ==================== Request Models ====================

class SourcingItemsByIdsRequest(BaseModel):
    ids: Optional[List[str]] = None


class SourcingCategoryCreate(BaseModel):
    name: str
    color: Optional[str] = None
    spec_fields: Optional[List[Dict[str, Any]]] = None
    sort_order: Optional[int] = None


class SourcingCategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    spec_fields: Optional[List[Dict[str, Any]]] = None
    sort_order: Optional[int] = None


class SourcingItemBase(BaseModel):
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


class SourcingItemCreate(SourcingItemBase):
    category_id: str
    title: str


class SourcingItemBatchEntry(SourcingItemBase):
    title: str


class SourcingItemBatchCreate(BaseModel):
    category_id: str
    items: List[SourcingItemBatchEntry]


class SourcingItemUpdate(SourcingItemBase):
    title: Optional[str] = None


class AiFillRequest(BaseModel):
    category_id: str
    mode: Literal["single", "batch", "selected"] = "single"
    product_names: Optional[List[str]] = None
    model: Optional[str] = None


class AiConfirmRequest(BaseModel):
    category_id: str
    items: List[Dict[str, Any]]


class AiBatchStartRequest(BaseModel):
    category_id: Optional[str] = None
    scheme_id: Optional[str] = None
    keyword: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    sort: Optional[str] = None
    model: Optional[str] = None


class SchemeGenerateRequest(BaseModel):
    type: str
    prompt: Optional[str] = ""
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


class PromptTemplateUpdate(BaseModel):
    content: Optional[str] = None


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


class ZhihuScrapeRunPayload(BaseModel):
    keyword_id: Optional[str] = None


class ZhihuQuestionCreatePayload(BaseModel):
    question_url: str
    keyword_id: str


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


class BlueLinkMapEntryPayload(BaseModel):
    account_id: str
    category_id: str
    product_id: Optional[str] = None
    sku_id: Optional[str] = None
    source_link: Optional[str] = None
    remark: Optional[str] = None


class BlueLinkMapBatchPayload(BaseModel):
    entries: List[BlueLinkMapEntryPayload]


class BlueLinkMapClearPayload(BaseModel):
    account_id: Optional[str] = None
    category_id: Optional[str] = None


class BlueLinkMapEntryUpdate(BaseModel):
    category_id: Optional[str] = None
    source_link: Optional[str] = None
    product_id: Optional[str] = None
    sku_id: Optional[str] = None
    remark: Optional[str] = None


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
    page: Optional[int] = None


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
ZHIHU_KEYWORDS_MAP_CACHE_TTL_SECONDS = 300.0

BLUE_LINK_MAP_CACHE: Dict[str, Any] = {"timestamp": 0.0, "data": None}
SOURCING_CATEGORY_COUNT_CACHE: Dict[str, Any] = {"timestamp": 0.0, "data": None}
ZHIHU_KEYWORDS_MAP_CACHE: Dict[str, Any] = {"timestamp": 0.0, "data": None}

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
BIGMODEL_API_KEY = os.getenv("BIGMODEL_API_KEY")

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

    "vote": "你是电商投票策划，请基于选品信息生成投票文案，包含简短背景、候选项要点与引导语。",

    "image": "你是电商视觉策划，结合选品参数生成商品图的文案与标题。",

    "comment_reply": "你是电商评论运营助手，请基于选品信息生成 {{count}} 组评论和回复，语气可信、互动自然，包含购买引导。{{prompt}}输出格式：\n评论：...\n回复：..."

}

PROMPT_TEMPLATE_STORE_PATH = DOWNLOAD_DIR / "prompt-templates.json"
PROMPT_TEMPLATE_OVERRIDES: Dict[str, str] = {}
PROMPT_TEMPLATE_LOCK = threading.Lock()


def load_prompt_template_overrides() -> None:
    if not PROMPT_TEMPLATE_STORE_PATH.exists():
        return
    try:
        raw = PROMPT_TEMPLATE_STORE_PATH.read_text(encoding="utf-8")
        data = json.loads(raw)
        if isinstance(data, dict):
            PROMPT_TEMPLATE_OVERRIDES.clear()
            for key, value in data.items():
                if isinstance(key, str) and isinstance(value, str):
                    PROMPT_TEMPLATE_OVERRIDES[key] = value
    except Exception:
        return


def save_prompt_template_overrides() -> None:
    payload = json.dumps(PROMPT_TEMPLATE_OVERRIDES, ensure_ascii=False, indent=2)
    tmp_path = PROMPT_TEMPLATE_STORE_PATH.with_suffix(".tmp")
    tmp_path.write_text(payload, encoding="utf-8")
    tmp_path.replace(PROMPT_TEMPLATE_STORE_PATH)


def get_prompt_template_overrides(keys: Optional[List[str]] = None) -> Dict[str, str]:
    with PROMPT_TEMPLATE_LOCK:
        if not keys:
            return dict(PROMPT_TEMPLATE_OVERRIDES)
        return {key: PROMPT_TEMPLATE_OVERRIDES[key] for key in keys if key in PROMPT_TEMPLATE_OVERRIDES}


load_prompt_template_overrides()


IMAGE_TEMPLATE_DEFAULT_CATEGORY = "默认模板"


def extract_template_title(html: str) -> Optional[str]:
    match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if not match:
        return None
    title = re.sub(r"\s+", " ", match.group(1)).strip()
    return title or None


def load_local_image_templates() -> List[Dict[str, Any]]:
    templates: List[Dict[str, Any]] = []
    if not LOCAL_IMAGE_TEMPLATE_DIR.exists():
        return templates
    for path in sorted(LOCAL_IMAGE_TEMPLATE_DIR.glob("*.html")):
        try:
            html = path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        templates.append(
            {
                "id": path.stem,
                "name": path.stem,
                "category": IMAGE_TEMPLATE_DEFAULT_CATEGORY,
                "html": html,
            }
        )
    return templates





supabase_client: Optional["SupabaseClient"] = None

zhihu_scheduler: Optional[AsyncIOScheduler] = None
zhihu_playwright = None
zhihu_browser = None
zhihu_job_store: Dict[str, Dict[str, Any]] = {}
zhihu_job_lock = threading.Lock()

sourcing_ai_job_store: Dict[str, Dict[str, Any]] = {}
sourcing_ai_job_lock = threading.Lock()




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



    async def count(self, table: str, params: Optional[Dict[str, Any]] = None) -> int:

        query = dict(params or {})

        query.setdefault("select", "id")

        query.setdefault("limit", 1)

        url = f"{self.rest_url}/{table.lstrip('/')}"

        headers = {

            "apikey": self.service_key,

            "Authorization": f"Bearer {self.service_key}",

            "Accept": "application/json",

            "Prefer": "count=exact",

        }

        try:

            response = await self._client.request("GET", url, params=query, headers=headers)

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

        content_range = response.headers.get("Content-Range") or ""

        match = re.search(r"/(\d+)$", content_range.strip())

        if match:

            return int(match.group(1))

        try:

            payload = response.json()

        except ValueError:

            return 0

        if isinstance(payload, list):

            return len(payload)

        return int(payload or 0)



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


def invalidate_zhihu_keywords_map_cache() -> None:
    ZHIHU_KEYWORDS_MAP_CACHE["timestamp"] = 0.0
    ZHIHU_KEYWORDS_MAP_CACHE["data"] = None


async def fetch_zhihu_keywords_map(client: SupabaseClient, force: bool = False) -> Dict[str, str]:
    now = time.time()
    cached = ZHIHU_KEYWORDS_MAP_CACHE.get("data")
    if not force and cached and now - ZHIHU_KEYWORDS_MAP_CACHE.get("timestamp", 0.0) < ZHIHU_KEYWORDS_MAP_CACHE_TTL_SECONDS:
        return cached
    rows = await client.select("zhihu_keywords", params={"select": "id,name"})
    payload = {str(row.get("id")): row.get("name") or "" for row in rows}
    ZHIHU_KEYWORDS_MAP_CACHE["timestamp"] = now
    ZHIHU_KEYWORDS_MAP_CACHE["data"] = payload
    return payload


async def fetch_supabase_count(client: Any, table: str, params: Optional[Dict[str, Any]] = None) -> int:
    query = dict(params or {})
    query.pop("limit", None)
    query.pop("offset", None)
    if hasattr(client, "count"):
        return await client.count(table, query)
    query["select"] = "id"
    rows = await client.select(table, query)
    return len(rows)


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


def strip_html_tags(value: str) -> str:
    if not value:
        return ""
    return re.sub(r"<[^>]+>", "", value)


def extract_zhihu_questions(items: List[Dict[str, Any]], limit: int = 200) -> List[Dict[str, str]]:
    results: List[Dict[str, str]] = []
    seen: Set[str] = set()
    for item in items or []:
        obj = item.get("object") or {}
        if obj.get("type") != "question":
            continue
        question = obj.get("question") or obj
        qid = str(question.get("id") or "").strip()
        title = strip_html_tags(question.get("title") or "").strip()
        if not qid or not title:
            continue
        if qid in seen:
            continue
        seen.add(qid)
        results.append({"id": qid, "title": title, "url": f"https://www.zhihu.com/question/{qid}"})
        if len(results) >= limit:
            break
    return results


def extract_zhihu_question_id(raw_value: str) -> str:
    value = str(raw_value or "").strip()
    if not value:
        return ""
    if value.isdigit():
        return value

    path_match = re.search(r"/question/(\d+)", value)
    if path_match:
        return path_match.group(1)

    target = value if "://" in value else f"https://{value.lstrip('/')}"
    try:
        parsed = urlparse(target)
    except Exception:
        return ""

    query = parse_qs(parsed.query or "")
    for key in ("question_id", "qid"):
        candidate = str((query.get(key) or [""])[0] or "").strip()
        if candidate.isdigit():
            return candidate

    return ""


def create_zhihu_job_state(total: int, keyword_id: Optional[str]) -> Dict[str, Any]:
    job_id = str(uuid4())
    now = utc_now_iso()
    state = {
        "id": job_id,
        "status": "queued",
        "keyword_id": keyword_id,
        "total": total,
        "processed": 0,
        "success": 0,
        "failed": 0,
        "error": None,
        "started_at": now,
        "updated_at": now,
    }
    with zhihu_job_lock:
        zhihu_job_store[job_id] = state
    return state


def update_zhihu_job_state(job_id: str, **updates: Any) -> None:
    with zhihu_job_lock:
        state = zhihu_job_store.get(job_id)
        if not state:
            return
        state.update(updates)
        state["updated_at"] = utc_now_iso()


def get_zhihu_job_state(job_id: str) -> Optional[Dict[str, Any]]:
    with zhihu_job_lock:
        state = zhihu_job_store.get(job_id)
        return dict(state) if state else None


def chunk_list(values: List[str], size: int) -> List[List[str]]:
    if size <= 0:
        return [values]
    return [values[i : i + size] for i in range(0, len(values), size)]


async def fetch_existing_question_ids(
    client: "SupabaseClient", keyword_id: Optional[str]
) -> List[str]:
    if keyword_id:
        rows = await client.select(
            "zhihu_question_keywords",
            {"keyword_id": f"eq.{keyword_id}", "select": "question_id"},
        )
        return [row.get("question_id") for row in rows if row.get("question_id")]
    rows = await client.select("zhihu_questions", {"select": "id"})
    return [row.get("id") for row in rows if row.get("id")]


async def fetch_existing_questions_map(
    client: "SupabaseClient", question_ids: List[str]
) -> Dict[str, Dict[str, Any]]:
    existing: Dict[str, Dict[str, Any]] = {}
    for chunk in chunk_list(question_ids, 200):
        if not chunk:
            continue
        rows = await client.select(
            "zhihu_questions",
            {
                "id": f"in.({','.join(chunk)})",
                "select": "id,title,url,first_keyword_id",
            },
        )
        for row in rows:
            qid = str(row.get("id") or "").strip()
            if not qid:
                continue
            existing[qid] = row
    return existing


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


async def collect_search_payloads(
    page: Any,
    search_url: str,
    offsets: List[int],
) -> List[Dict[str, Any]]:
    results: List[Dict[str, Any]] = []
    if not offsets:
        return results
    first_offset = offsets[0]
    try:
        async with page.expect_response(
            lambda r: "api/v4/search_v3" in r.url and f"offset={first_offset}" in r.url,
            timeout=15000,
        ) as response_info:
            await page.goto(search_url, wait_until="domcontentloaded")
        response = await response_info.value
        payload = await response.json()
        results.extend(payload.get("data") or [])
    except Exception:
        try:
            response = await page.wait_for_response(
                lambda r: "api/v4/search_v3" in r.url and f"offset={first_offset}" in r.url,
                timeout=15000,
            )
            payload = await response.json()
            results.extend(payload.get("data") or [])
        except Exception:
            pass

    for offset in offsets[1:]:
        try:
            await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            response = await page.wait_for_response(
                lambda r: "api/v4/search_v3" in r.url and f"offset={offset}" in r.url,
                timeout=15000,
            )
            payload = await response.json()
            results.extend(payload.get("data") or [])
            await page.wait_for_timeout(800)
        except Exception:
            continue
    return results


def get_zhihu_search_headers() -> Dict[str, str]:
    raw = os.getenv("ZHIHU_SEARCH_HEADERS", "").strip()
    if not raw:
        return {}
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return {}
    if not isinstance(payload, dict):
        return {}
    headers = {str(key): str(value) for key, value in payload.items() if value is not None}
    lower_keys = {key.lower() for key in headers}
    if ZHIHU_COOKIE and "cookie" not in lower_keys:
        headers["cookie"] = ZHIHU_COOKIE
    if ZHIHU_UA and "user-agent" not in lower_keys:
        headers["User-Agent"] = ZHIHU_UA
    return headers


async def fetch_search_results_via_api(
    keyword: str,
    headers: Dict[str, str],
    requester: Optional[
        Callable[[int, Dict[str, Any], Dict[str, str]], Awaitable[Dict[str, Any]]]
    ] = None,
) -> List[Dict[str, Any]]:
    offsets = list(range(0, 200, 20))
    results: List[Dict[str, Any]] = []
    base_params = {
        "gk_version": "gz-gaokao",
        "t": "question",
        "q": keyword,
        "correction": "1",
        "limit": 20,
        "filter_fields": "",
        "lc_idx": "0",
        "show_all_topics": "0",
        "search_source": "Normal",
    }
    if requester:
        for offset in offsets:
            params = {**base_params, "offset": offset}
            payload = await requester(offset, params, headers)
            results.extend(payload.get("data") or [])
        return results

    async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
        for offset in offsets:
            params = {**base_params, "offset": offset}
            try:
                response = await client.get(
                    "https://www.zhihu.com/api/v4/search_v3", params=params
                )
                response.raise_for_status()
                payload = response.json()
                if isinstance(payload, dict):
                    results.extend(payload.get("data") or [])
            except Exception:
                continue
    return results


async def fetch_question_stats_via_api(
    question_id: str,
    headers: Dict[str, str],
    requester: Optional[
        Callable[[str, Dict[str, Any], Dict[str, str]], Awaitable[Dict[str, Any]]]
    ] = None,
) -> Optional[Dict[str, Any]]:
    params = {"include": "title,visit_count,answer_count"}
    if requester:
        return await requester(question_id, params, headers)

    async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
        response = await client.get(
            f"https://www.zhihu.com/api/v4/questions/{question_id}", params=params
        )
        response.raise_for_status()
        payload = response.json()
        if isinstance(payload, dict):
            return payload
    return None


async def fetch_search_results_for_keyword(
    keyword: str,
    response_fetcher: Optional[Callable[[int], Awaitable[Dict[str, Any]]]] = None,
) -> List[Dict[str, Any]]:
    offsets = list(range(0, 200, 20))
    results: List[Dict[str, Any]] = []
    if response_fetcher:
        for offset in offsets:
            try:
                payload = await response_fetcher(offset)
            except Exception:
                continue
            results.extend(payload.get("data") or [])
        return results

    headers = get_zhihu_search_headers()
    if headers:
        return await fetch_search_results_via_api(keyword, headers)

    browser = await ensure_zhihu_browser()
    context = await browser.new_context(user_agent=ZHIHU_UA)
    if ZHIHU_COOKIE:
        await context.add_cookies(parse_cookie_header(ZHIHU_COOKIE, ".zhihu.com"))
    page = await context.new_page()
    try:
        search_url = f"https://www.zhihu.com/search?type=content&q={quote(keyword)}"
        results.extend(await collect_search_payloads(page, search_url, offsets))
    finally:
        await context.close()
    return results


async def fetch_question_stats(
    question_id: str,
    response_fetcher: Optional[Callable[[], Awaitable[Dict[str, Any]]]] = None,
) -> Optional[Dict[str, Any]]:
    if response_fetcher:
        return await response_fetcher()

    headers = get_zhihu_search_headers()
    if headers:
        return await fetch_question_stats_via_api(question_id, headers)

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
    keyword_id: Optional[str] = None,
    include_existing: bool = False,
    job_id: Optional[str] = None,
) -> None:
    client = client or ensure_supabase()
    if keyword_id:
        keywords = await client.select("zhihu_keywords", {"id": f"eq.{keyword_id}"})
    else:
        keywords = await client.select("zhihu_keywords", params={"order": "created_at.asc"})

    if not keywords:
        if job_id:
            update_zhihu_job_state(job_id, status="done", total=0, processed=0)
        return

    today_value = today or shanghai_today()
    now_value = now or utc_now_iso()
    search_fetcher = search_fetcher or fetch_search_results_for_keyword
    detail_fetcher = detail_fetcher or fetch_question_stats

    keyword_questions: Dict[str, List[Dict[str, str]]] = {}
    question_info: Dict[str, Dict[str, Any]] = {}
    question_order: List[str] = []
    question_keywords: Dict[str, Set[str]] = {}

    for keyword in keywords:
        name = (keyword.get("name") or "").strip()
        kid = keyword.get("id")
        if not name or not kid:
            continue
        raw_items = await search_fetcher(name)
        questions = extract_zhihu_questions(raw_items, limit=200)
        keyword_questions[str(kid)] = questions
        for question in questions:
            qid = question.get("id")
            if not qid or qid in question_info:
                if qid:
                    question_keywords.setdefault(qid, set()).add(str(kid))
                continue
            question_info[qid] = {
                "title": question.get("title") or "",
                "url": question.get("url") or f"https://www.zhihu.com/question/{qid}",
                "first_keyword_id": kid,
            }
            question_order.append(qid)
            question_keywords.setdefault(qid, set()).add(str(kid))

    if include_existing:
        existing_ids = await fetch_existing_question_ids(client, keyword_id)
        for qid in existing_ids:
            qid_value = str(qid or "").strip()
            if not qid_value:
                continue
            if qid_value in question_info:
                continue
            question_info[qid_value] = {}
            question_order.append(qid_value)

    existing_map = await fetch_existing_questions_map(client, question_order)

    total = len(question_order)
    processed = 0
    success = 0
    failed = 0
    if total == 0 and not get_zhihu_search_headers():
        if job_id:
            update_zhihu_job_state(
                job_id,
                status="error",
                error="未配置 ZHIHU_SEARCH_HEADERS，无法抓取搜索结果",
            )
        return
    if job_id:
        update_zhihu_job_state(job_id, status="running", total=total, processed=0, success=0, failed=0)

    try:
        for qid in question_order:
            info = question_info.get(qid) or {}
            existing_row = existing_map.get(qid) or {}
            title = info.get("title") or existing_row.get("title") or ""
            url = info.get("url") or existing_row.get("url") or f"https://www.zhihu.com/question/{qid}"
            first_keyword_id = (
                existing_row.get("first_keyword_id")
                or info.get("first_keyword_id")
            )
            payload = {
                "id": qid,
                "title": title,
                "url": url,
                "first_keyword_id": first_keyword_id,
                "updated_at": now_value,
                "last_seen_at": now_value,
            }
            if not existing_row:
                payload["created_at"] = now_value

            await client.request(
                "POST",
                "zhihu_questions",
                params={"on_conflict": "id"},
                json_payload=payload,
                prefer="resolution=merge-duplicates,return=representation",
            )

            for kid in sorted(question_keywords.get(qid, set())):
                await client.request(
                    "POST",
                    "zhihu_question_keywords",
                    params={"on_conflict": "question_id,keyword_id"},
                    json_payload={
                        "question_id": qid,
                        "keyword_id": kid,
                        "first_seen_at": now_value,
                        "last_seen_at": now_value,
                    },
                    prefer="resolution=merge-duplicates,return=representation",
                )

            detail = await detail_fetcher(qid)
            if detail:
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
                success += 1
            else:
                failed += 1

            processed += 1
            if job_id:
                update_zhihu_job_state(
                    job_id,
                    processed=processed,
                    success=success,
                    failed=failed,
                    status="running",
                )

        cutoff = today_value - timedelta(days=15)
        await client.delete("zhihu_question_stats", {"stat_date": f"lt.{cutoff}"})

        if job_id:
            update_zhihu_job_state(job_id, status="done", processed=processed, success=success, failed=failed)
    except Exception as exc:
        if job_id:
            update_zhihu_job_state(job_id, status="error", error=str(exc))
        raise


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


def extract_taobao_item_id(raw_text: str) -> str:
    if not raw_text:
        return ""

    candidates: List[str] = []

    def collect(text: str):
        if not text:
            return
        patterns = [
            r"[?&](?:id|itemId|item_id|num_iid)=(\d{5,})",
            r"/i(\d{5,})\.htm",
            r"item\.(?:htm|html)/(\d{5,})",
        ]
        for pattern in patterns:
            for match in re.findall(pattern, text, flags=re.IGNORECASE):
                if match:
                    candidates.append(match)

    collect(raw_text)
    try:
        decoded = unquote(raw_text)
        if decoded != raw_text:
            collect(decoded)
    except Exception:
        pass

    for candidate in candidates:
        value = str(candidate).strip()
        if value.isdigit() and len(value) >= 5:
            return value
    return ""


def extract_taobao_tar_target(raw_url: str) -> str:
    parsed = urlparse(str(raw_url or "").strip())
    if not parsed.query:
        return ""

    query = parse_qs(parsed.query)
    tar_value = (query.get("tar") or [""])[0]
    tar_value = html.unescape(str(tar_value or "")).strip()
    if not tar_value:
        return ""

    try:
        return unquote(tar_value)
    except Exception:
        return tar_value


async def resolve_taobao_url(url: str) -> Tuple[str, str]:
    target = str(url or "").strip()
    if not target:
        return "", ""

    timeout = aiohttp.ClientTimeout(total=15)
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/132.0.0.0 Safari/537.36"
        )
    }

    try:
        async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
            async with session.get(target, allow_redirects=True) as response:
                resolved_url = str(response.url)
                page_text = await response.text(errors="ignore")

            jump_match = re.search(
                r'real_jump_address\s*=\s*[\'"]([^\'"]+)[\'"]',
                page_text,
                flags=re.IGNORECASE,
            )
            jump_url = html.unescape(jump_match.group(1) or "").strip() if jump_match else ""
            if jump_url:
                try:
                    async with session.get(
                        jump_url,
                        allow_redirects=False,
                        headers={"Referer": resolved_url or target},
                    ) as jump_response:
                        redirect_location = html.unescape(
                            str(jump_response.headers.get("Location") or "")
                        ).strip()
                except Exception:
                    redirect_location = ""

                if redirect_location:
                    tar_target = extract_taobao_tar_target(redirect_location)
                    resolved_url = tar_target or redirect_location
                else:
                    tar_target = extract_taobao_tar_target(jump_url)
                    resolved_url = tar_target or jump_url

        return resolved_url or target, page_text
    except Exception:
        return target, ""


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


async def ai_fill_product_params(
    category_name: str,
    spec_fields: List[Dict[str, Any]],
    product_names: List[str],
    model_override: Optional[str] = None
) -> List[Dict[str, str]]:
    """根据商品名称和预设字段，调用大模型返回参数"""
    use_deepseek = bool(model_override and "deepseek" in model_override.lower())
    use_bigmodel = bool(model_override and model_override.lower().startswith("glm-4.7"))
    if use_deepseek:
        if not DEEPSEEK_API_KEY or not deepseek_client:
            raise HTTPException(status_code=500, detail="未配置 DeepSeek API 密钥")
    elif use_bigmodel:
        bigmodel_api_key = os.getenv("BIGMODEL_API_KEY") or BIGMODEL_API_KEY
        if not bigmodel_api_key:
            raise HTTPException(status_code=500, detail="未配置 BIGMODEL API 密钥")
    else:
        DASHSCOPE_API_KEY = os.getenv("DASHSCOPE_API_KEY")
        if not DASHSCOPE_API_KEY:
            raise HTTPException(status_code=500, detail="DASHSCOPE_API_KEY 未配置")

    if not spec_fields:
        raise HTTPException(status_code=400, detail="预设字段为空")
    if not product_names:
        raise HTTPException(status_code=400, detail="商品列表为空")

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
    field_keys = [f.get("key", "") for f in spec_fields if f.get("key")]

    prompt = f"""你是资深电商数据专家，擅长通过联网搜索获取最新的商品技术规格，并转化为结构化数据。\n\n**当前品类：** `{category_name}`\n\n**必须检索并填充的\"预设字段\"（示例值）：** `{fields_str}`\n\n\n**任务指令：**\n\n1. **联网搜索**：请针对提供的商品列表，在互联网搜索其官方规格参数、电商详情页或专业测评。商品列表为：\n{products_str}\n\n2. **数据提取**：准确识别并提取与\"预设字段\"对应的真实参数值，不允许推测。\n\n3. **撰写评价**：基于搜索到的产品卖点，撰写 30 字以内的专业、中肯的总结评价。\n\n\n**约束条件（严格遵守）：**\n\n- **真实性**：所有参数必须基于搜索到的客观事实，严禁凭空虚构。若某个字段在全网均无法确认，请保持为空字符串 \"\"。\n\n- **单位统一**：参数值需保留原始单位（如：5000mAh, 65W）。\n- **输出示例格式：** [ {{ \"name\": \"商品全名\", \"评价\": \"评价文案\", \"{field_keys[0]}\": \"真实参数值\", \"{field_keys[1]}\": \"真实参数值\" }} ]\n"""

    if use_bigmodel:
        search_lines: List[str] = []
        headers = {
            "Authorization": f"Bearer {bigmodel_api_key}",
            "Content-Type": "application/json",
        }
        for name in product_names:
            query = f"{name} 参数"
            search_payload = {
                "search_query": query,
                "search_engine": "search_std",
                "count": 5,
                "search_intent": False,
                "content_size": "high",
            }
            try:
                search_resp = httpx.post(
                    "https://open.bigmodel.cn/api/paas/v4/web_search",
                    headers=headers,
                    json=search_payload,
                    timeout=30.0,
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=500,
                    detail=f"网络搜索失败: {str(exc)}",
                )
            if search_resp.status_code != 200:
                raise HTTPException(
                    status_code=500,
                    detail=f"网络搜索失败: {search_resp.text[:200]}",
                )
            search_data = search_resp.json() or {}
            items = search_data.get("search_result") or []
            if items:
                snippets = []
                for item in items[:3]:
                    title = str(item.get("title") or "")
                    content = str(item.get("content") or "")
                    link = str(item.get("link") or "")
                    snippets.append(f"- {title} | {content} | {link}".strip())
                search_lines.append(f"商品：{name}\n" + "\n".join(snippets))

        if search_lines:
            prompt = f"{prompt}\n\n搜索结果（仅供参考）：\n" + "\n\n".join(search_lines)

        chat_payload = {
            "model": model_override or "glm-4.7-FlashX",
            "messages": [
                {"role": "system", "content": "你是商品参数提取助手。"},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
        }
        try:
            chat_resp = httpx.post(
                "https://open.bigmodel.cn/api/paas/v4/chat/completions",
                headers=headers,
                json=chat_payload,
                timeout=300.0,
            )
        except Exception as exc:
            raise HTTPException(
                status_code=500,
                detail=f"GLM调用失败: {str(exc)}",
            )
        if chat_resp.status_code != 200:
            raise HTTPException(
                status_code=500,
                detail=f"GLM调用失败: {chat_resp.text[:200]}",
            )
        chat_data = chat_resp.json() or {}
        choices = chat_data.get("choices") or []
    elif use_deepseek:
        response = await asyncio.to_thread(
            deepseek_client.chat.completions.create,
            model=model_override or (DEEPSEEK_MODEL or "deepseek-chat"),
            messages=[
                {"role": "system", "content": "你是商品参数提取助手。"},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2
        )
        choices = response.choices or []
    else:
        dashscope_base_url = os.getenv("DASHSCOPE_BASE_URL") or "https://dashscope.aliyuncs.com/compatible-mode/v1"
        dashscope_client = OpenAI(
            api_key=DASHSCOPE_API_KEY,
            base_url=dashscope_base_url,
        )
        response = await asyncio.to_thread(
            dashscope_client.chat.completions.create,
            model=model_override or "qwen3-max-2026-01-23",
            messages=[{"role": "user", "content": prompt}],
            extra_body={
                "enable_search": True,
                "search_options": {
                    "search_strategy": "max",
                    "forced_search": True,
                },
                "enable_source": True,
            },
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

    import json
    content = extract_choice_content(choices[0])

    # Clean possible markdown code fences
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
        print('[AI_PARAMS_RAW]', content[:2000])
        result = json.loads(content)
    except json.JSONDecodeError:
        # Fallback: try the first JSON array in text
        fallback = None
        start_idx = content.find("[")
        end_idx = content.rfind("]")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            candidate = content[start_idx:end_idx + 1]
            try:
                fallback = json.loads(candidate)
                result = fallback
            except json.JSONDecodeError:
                fallback = None
        if fallback is None:
            raise HTTPException(
                status_code=500,
                detail=f"AI返回的不是有效JSON: {content[:200]}..."
            )

    if not isinstance(result, list):
        raise HTTPException(
            status_code=500,
            detail=f"AI返回格式错误，应为数组"
        )

    for item in result:
        if not isinstance(item, dict) or "name" not in item:
            raise HTTPException(
                status_code=500,
                detail=f"AI返回项缺少name字段: {item}"
            )
        allowed_keys = set(field_keys + ["name", "评价"])
        for key in list(item.keys()):
            if key not in allowed_keys:
                del item[key]

    return result


async def fetch_sourcing_items_by_id_list(client: "SupabaseClient", ids: List[str]) -> List[Dict[str, Any]]:
    if not ids:
        return []
    fetched: List[Dict[str, Any]] = []
    for chunk in chunk_list(ids, 200):
        if not chunk:
            continue
        quoted = ",".join([f"\"{item_id}\"" for item_id in chunk])
        rows = await client.select(
            "sourcing_items",
            params={"id": f"in.({quoted})", "select": "id,title,uid,category_id,price,remark,spec"}
        )
        fetched.extend(rows or [])
    return fetched

async def fetch_sourcing_items_filtered(
    client: "SupabaseClient",
    *,
    category_id: Optional[str],
    keyword: str
) -> List[Dict[str, Any]]:
    safe_keyword = keyword.replace("%", "").replace("*", "").strip()
    items: List[Dict[str, Any]] = []
    offset = 0
    limit = 200
    while True:
        params: Dict[str, Any] = {
            "select": "id,title,uid,category_id,price,remark,spec",
            "order": "created_at.desc",
            "limit": limit,
            "offset": offset,
        }
        if category_id:
            params["category_id"] = f"eq.{category_id}"
        if safe_keyword:
            params["or"] = f"(title.ilike.*{safe_keyword}*,uid.ilike.*{safe_keyword}*)"
        rows = await client.select("sourcing_items", params=params)
        if not rows:
            break
        items.extend(rows)
        if len(rows) < limit:
            break
        offset += limit
    return items

def match_sourcing_keyword(item: Dict[str, Any], keyword: str) -> bool:
    if not keyword:
        return True
    needle = keyword.lower()
    title = str(item.get("title") or "").lower()
    uid = str(item.get("uid") or "").lower()
    return needle in title or needle in uid

def match_sourcing_price(item: Dict[str, Any], price_min: Optional[float], price_max: Optional[float]) -> bool:
    if price_min is None and price_max is None:
        return True
    try:
        price = float(item.get("price") or 0)
    except (TypeError, ValueError):
        return False
    if price_min is not None and price < price_min:
        return False
    if price_max is not None and price > price_max:
        return False
    return True

async def resolve_sourcing_ai_batch_items(
    client: "SupabaseClient",
    payload: "AiBatchStartRequest"
) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    category_id = (payload.category_id or "").strip() or None
    scheme_id = (payload.scheme_id or "").strip() or None
    keyword = (payload.keyword or "").strip()
    price_min = payload.price_min
    price_max = payload.price_max
    items: List[Dict[str, Any]] = []

    if scheme_id:
        rows = await client.select("schemes", {"id": f"eq.{scheme_id}"})
        if not rows:
            raise HTTPException(status_code=404, detail="方案不存在")
        scheme = normalize_scheme(rows[0])
        if not category_id:
            category_id = scheme.get("category_id") or None
        entries = scheme.get("items") or []
        raw_ids = []
        seen = set()
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            raw_id = str(entry.get("source_id") or entry.get("id") or "").strip()
            if not raw_id or raw_id in seen:
                continue
            seen.add(raw_id)
            raw_ids.append(raw_id)
        fetched = await fetch_sourcing_items_by_id_list(client, raw_ids)
        item_map = {str(item.get("id")): item for item in fetched}
        items = [item_map.get(item_id) for item_id in raw_ids if item_map.get(item_id)]
    else:
        items = await fetch_sourcing_items_filtered(
            client,
            category_id=category_id,
            keyword=keyword
        )

    if category_id:
        items = [item for item in items if str(item.get("category_id") or "") == str(category_id)]
    if keyword:
        items = [item for item in items if match_sourcing_keyword(item, keyword)]
    items = [item for item in items if match_sourcing_price(item, price_min, price_max)]
    return items, category_id

async def run_sourcing_ai_batch_job(
    job_id: str,
    items: List[Dict[str, Any]],
    category_name: str,
    spec_fields_raw: List[Dict[str, Any]],
    model_override: Optional[str]
) -> None:
    client = ensure_supabase()
    field_keys = [f.get("key") for f in spec_fields_raw if f.get("key")]
    total = len(items)
    processed = 0
    success = 0
    failed = 0
    failures: List[Dict[str, Any]] = []
    update_sourcing_ai_job_state(
        job_id,
        status="running",
        total=total,
        processed=0,
        success=0,
        failed=0,
        failures=[],
    )
    try:
        for chunk in chunk_list(items, 10):
            if not chunk:
                continue
            names = [str(item.get("title") or "").strip() for item in chunk]
            try:
                results = await ai_fill_product_params(
                    category_name,
                    spec_fields_raw,
                    names,
                    model_override=model_override,
                )
            except Exception as exc:
                reason = str(exc)
                for item in chunk:
                    processed += 1
                    failed += 1
                    failures.append({
                        "name": str(item.get("title") or ""),
                        "reason": reason,
                    })
                update_sourcing_ai_job_state(
                    job_id,
                    processed=processed,
                    success=success,
                    failed=failed,
                    failures=failures[-50:],
                )
                continue
            result_map = {
                str(item.get("name") or "").strip(): item for item in results if isinstance(item, dict)
            }
            fallback = results if len(results) == len(chunk) else None
            for index, item in enumerate(chunk):
                name = str(item.get("title") or "").strip()
                ai_item = result_map.get(name) if name else None
                if not ai_item and fallback:
                    ai_item = fallback[index] if index < len(fallback) else None
                if not ai_item or not isinstance(ai_item, dict):
                    processed += 1
                    failed += 1
                    failures.append({"name": name, "reason": "AI未返回结果"})
                    update_sourcing_ai_job_state(
                        job_id,
                        processed=processed,
                        success=success,
                        failed=failed,
                        failures=failures[-50:],
                    )
                    continue
                spec_updates: Dict[str, Any] = {}
                existing_spec = item.get("spec") or {}
                for field in field_keys:
                    if not field:
                        continue
                    new_value = str(ai_item.get(field) or "").strip()
                    if not new_value:
                        continue
                    if str(existing_spec.get(field) or "").strip():
                        continue
                    spec_updates[field] = new_value
                review_text = str(ai_item.get("评价") or "").strip()
                existing_remark = str(item.get("remark") or "").strip()
                should_set_remark = bool(review_text) and not existing_remark
                updates = {
                    "updated_at": utc_now_iso(),
                }
                if spec_updates:
                    merged_spec = {**existing_spec, **spec_updates}
                    updates["spec"] = normalize_spec_payload(merged_spec)
                if should_set_remark:
                    updates["remark"] = review_text
                try:
                    if spec_updates or should_set_remark:
                        await client.update(
                            "sourcing_items",
                            updates,
                            {"id": f"eq.{item.get('id')}"}
                        )
                    processed += 1
                    success += 1
                except Exception as exc:
                    processed += 1
                    failed += 1
                    failures.append({"name": name, "reason": str(exc)})
                update_sourcing_ai_job_state(
                    job_id,
                    processed=processed,
                    success=success,
                    failed=failed,
                    failures=failures[-50:],
                )
        update_sourcing_ai_job_state(job_id, status="done")
    except Exception as exc:
        update_sourcing_ai_job_state(
            job_id,
            status="error",
            error=str(exc),
        )

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





def normalize_blue_link_source_link(source_link: Optional[str]) -> str:

    text = str(source_link or "")

    text = re.sub(r"[\u200b-\u200d\u2060\ufeff\u00a0\u2800]", "", text)

    return text.strip()






def is_valid_blue_link_source_link(source_link: str) -> bool:

    try:

        parsed = urlparse(source_link)

    except ValueError:

        return False

    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)






def detect_blue_link_platform(source_link: Optional[str]) -> str:

    link = normalize_blue_link_source_link(source_link).lower()

    if any(domain in link for domain in ("taobao.com", "tmall.com", "tb.cn")):

        return "tb"

    return "jd"





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

        raise HTTPException(status_code=404, detail="方案不存在")

    return {"scheme": normalize_scheme(rows[0])}




@app.post("/api/schemes")

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




@app.patch("/api/schemes/{scheme_id}")

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




@app.delete("/api/schemes/{scheme_id}")

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


@app.get("/api/image/templates")
async def list_image_templates():
    templates = load_local_image_templates()
    return {"templates": templates}


@app.get("/api/prompts")
async def list_prompt_templates(keys: Optional[str] = Query(None)):
    key_list: List[str] = []
    if keys:
        key_list = [key.strip() for key in keys.split(",") if key.strip()]
    templates = get_prompt_template_overrides(key_list or None)
    return {"templates": templates}


@app.patch("/api/prompts/{key}")
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

        # ?? spec ????
        spec: Dict[str, Any] = {}

        # ???????
        for field in spec_fields:
            value = item_data.get(field, "")
            if value:
                spec[field] = value

        # ???? spec ???
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

        # ????
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






@app.post("/api/sourcing/items/ai-batch/start")

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

@app.get("/api/sourcing/items/ai-batch/status/{job_id}")

async def ai_batch_status(job_id: str):
    state = get_sourcing_ai_job_state(job_id)
    if not state:
        raise HTTPException(status_code=404, detail="\u4efb\u52a1\u4e0d\u5b58\u5728")
    return state

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


@app.get("/api/zhihu/keywords/counts")
async def list_zhihu_keyword_counts():
    client = ensure_supabase()
    keywords, mappings, total = await asyncio.gather(
        client.select("zhihu_keywords", params={"select": "id"}),
        client.select("zhihu_question_keywords", params={"select": "keyword_id"}),
        fetch_supabase_count(client, "zhihu_questions"),
    )
    counts: Dict[str, int] = {}
    for row in mappings:
        keyword_id = row.get("keyword_id")
        if not keyword_id:
            continue
        key = str(keyword_id)
        counts[key] = counts.get(key, 0) + 1
    for keyword in keywords:
        keyword_id = keyword.get("id")
        if not keyword_id:
            continue
        counts.setdefault(str(keyword_id), 0)
    return {"counts": counts, "total": total}


@app.post("/api/zhihu/keywords")
async def create_zhihu_keyword(payload: ZhihuKeywordPayload):
    client = ensure_supabase()
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="???????")
    body = {"name": name, "created_at": utc_now_iso(), "updated_at": utc_now_iso()}
    try:
        record = await client.insert("zhihu_keywords", body)
        invalidate_zhihu_keywords_map_cache()
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
    invalidate_zhihu_keywords_map_cache()
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
    invalidate_zhihu_keywords_map_cache()
    return {"status": "ok"}


@app.post("/api/zhihu/questions")
async def create_zhihu_question(payload: ZhihuQuestionCreatePayload):
    client = ensure_supabase()
    keyword_id = payload.keyword_id.strip()
    question_url = payload.question_url.strip()

    if not keyword_id:
        raise HTTPException(status_code=400, detail="keyword_id is required")
    if not question_url:
        raise HTTPException(status_code=400, detail="question_url is required")

    keyword_rows = await client.select(
        "zhihu_keywords",
        {"id": f"eq.{keyword_id}", "select": "id,name", "limit": 1},
    )
    if not keyword_rows:
        raise HTTPException(status_code=404, detail="Keyword not found")

    question_id = extract_zhihu_question_id(question_url)
    if not question_id:
        raise HTTPException(status_code=400, detail="Invalid Zhihu question URL")

    existing_rows = await client.select(
        "zhihu_questions",
        {"id": f"eq.{question_id}", "limit": 1},
    )
    existing_row = existing_rows[0] if existing_rows else {}

    detail = await fetch_question_stats(question_id)
    if not detail:
        raise HTTPException(status_code=502, detail="Failed to fetch question stats")

    title = strip_html_tags(str(detail.get("title") or "")).strip() or str(
        existing_row.get("title") or ""
    ).strip()
    if not title:
        raise HTTPException(status_code=502, detail="Failed to fetch question title")

    now_value = utc_now_iso()
    stat_date = str(shanghai_today())
    canonical_url = f"https://www.zhihu.com/question/{question_id}"
    first_keyword_id = str(existing_row.get("first_keyword_id") or keyword_id)
    is_new = not bool(existing_row)

    question_payload: Dict[str, Any] = {
        "id": question_id,
        "title": title,
        "url": canonical_url,
        "first_keyword_id": first_keyword_id,
        "updated_at": now_value,
        "last_seen_at": now_value,
    }
    if is_new:
        question_payload["created_at"] = now_value

    stat_payload = {
        "question_id": question_id,
        "stat_date": stat_date,
        "view_count": int(detail.get("visit_count") or 0),
        "answer_count": int(detail.get("answer_count") or 0),
        "fetched_at": now_value,
    }

    try:
        await client.request(
            "POST",
            "zhihu_questions",
            params={"on_conflict": "id"},
            json_payload=question_payload,
            prefer="resolution=merge-duplicates,return=representation",
        )
        await client.request(
            "POST",
            "zhihu_question_keywords",
            params={"on_conflict": "question_id,keyword_id"},
            json_payload={
                "question_id": question_id,
                "keyword_id": keyword_id,
                "first_seen_at": now_value,
                "last_seen_at": now_value,
            },
            prefer="resolution=merge-duplicates,return=representation",
        )
        await client.request(
            "POST",
            "zhihu_question_stats",
            params={"on_conflict": "question_id,stat_date"},
            json_payload=stat_payload,
            prefer="resolution=merge-duplicates,return=representation",
        )
    except SupabaseError as exc:
        status_code = exc.status_code if 400 <= int(exc.status_code or 0) < 500 else 500
        raise HTTPException(status_code=status_code, detail=str(exc.message))

    stats_rows = await client.select(
        "zhihu_question_stats",
        {
            "question_id": f"eq.{question_id}",
            "select": "question_id,view_count,answer_count,stat_date",
            "order": "stat_date.desc",
            "limit": 2,
        },
    )
    latest_row = stats_rows[0] if stats_rows else stat_payload
    previous_row = stats_rows[1] if len(stats_rows) > 1 else {}

    view_total = int(latest_row.get("view_count") or 0)
    answer_total = int(latest_row.get("answer_count") or 0)
    view_delta = view_total - int(previous_row.get("view_count") or 0) if previous_row else 0
    answer_delta = (
        answer_total - int(previous_row.get("answer_count") or 0) if previous_row else 0
    )

    keyword_map = await fetch_zhihu_keywords_map(client)
    first_keyword_name = keyword_map.get(first_keyword_id) or str(
        keyword_rows[0].get("name") or "???"
    )

    return {
        "item": {
            "id": question_id,
            "title": title,
            "url": canonical_url,
            "first_keyword_id": first_keyword_id,
            "first_keyword": first_keyword_name,
            "created_at": existing_row.get("created_at") or now_value,
            "updated_at": now_value,
            "last_seen_at": now_value,
            "view_count_total": view_total,
            "answer_count_total": answer_total,
            "view_count_delta": view_delta,
            "answer_count_delta": answer_delta,
        },
        "is_new": is_new,
    }


@app.get("/api/zhihu/questions")
async def list_zhihu_questions(keyword_id: Optional[str] = None, q: Optional[str] = None, limit: int = 50, offset: int = 0):
    client = ensure_supabase()
    limit = max(1, min(int(limit or 50), 200))
    offset = max(0, int(offset or 0))

    params: Dict[str, Any] = {
        "select": "id,title,url,first_keyword_id,created_at,updated_at,last_seen_at",
        "order": "updated_at.desc",
        "limit": limit,
        "offset": offset,
    }
    count_params: Dict[str, Any] = {}

    safe_q = None
    if q:
        safe_q = q.replace("%", "").replace("*", "").strip()
        if safe_q:
            title_filter = f"ilike.*{safe_q}*"
            params["title"] = title_filter
            count_params["title"] = title_filter

    matched_ids: List[str] = []
    if keyword_id:
        mapping = await client.select(
            "zhihu_question_keywords",
            {"keyword_id": f"eq.{keyword_id}", "select": "question_id"},
        )
        matched_ids = list(dict.fromkeys(str(row.get("question_id")) for row in mapping if row.get("question_id")))
        if not matched_ids:
            return {
                "items": [],
                "total": 0,
                "pagination": {
                    "offset": offset,
                    "limit": limit,
                    "has_more": False,
                    "next_offset": offset,
                    "total": 0,
                },
            }
        id_filter = f"in.({','.join(matched_ids)})"
        params["id"] = id_filter
        count_params["id"] = id_filter

    questions_task = client.select("zhihu_questions", params)
    total_task = fetch_supabase_count(client, "zhihu_questions", count_params)
    questions, total = await asyncio.gather(questions_task, total_task)

    question_ids = [str(row.get("id")) for row in questions if row.get("id")]
    if question_ids:
        stats_limit = min(max(len(question_ids) * 15, len(question_ids) * 2), 3000)
        stats_params = {
            "question_id": f"in.({','.join(question_ids)})",
            "select": "question_id,view_count,answer_count,stat_date",
            "order": "stat_date.desc",
            "limit": stats_limit,
        }
        stats_rows, keyword_map = await asyncio.gather(
            client.select("zhihu_question_stats", stats_params),
            fetch_zhihu_keywords_map(client),
        )
    else:
        stats_rows = []
        keyword_map = {}

    stats_map: Dict[str, List[Dict[str, Any]]] = {}
    for row in stats_rows:
        qid = str(row.get("question_id") or "")
        if not qid:
            continue
        stats_map.setdefault(qid, []).append(row)

    for snapshots in stats_map.values():
        snapshots.sort(key=lambda item: str(item.get("stat_date") or ""), reverse=True)

    items = []
    for row in questions:
        qid = str(row.get("id") or "")
        snapshots = stats_map.get(qid, [])
        latest_row = snapshots[0] if snapshots else {}
        previous_row = snapshots[1] if len(snapshots) > 1 else {}
        view_total = int(latest_row.get("view_count") or 0)
        answer_total = int(latest_row.get("answer_count") or 0)
        view_delta = (
            view_total - int(previous_row.get("view_count") or 0) if previous_row else 0
        )
        answer_delta = (
            answer_total - int(previous_row.get("answer_count") or 0) if previous_row else 0
        )
        items.append(
            {
                **row,
                "first_keyword": keyword_map.get(str(row.get("first_keyword_id")) or "", "???"),
                "view_count_total": view_total,
                "answer_count_total": answer_total,
                "view_count_delta": view_delta,
                "answer_count_delta": answer_delta,
            }
        )

    next_offset = offset + len(items)
    has_more = next_offset < total
    return {
        "items": items,
        "total": total,
        "pagination": {
            "offset": offset,
            "limit": limit,
            "has_more": has_more,
            "next_offset": next_offset,
            "total": total,
        },
    }


@app.delete("/api/zhihu/questions/{question_id}")
async def delete_zhihu_question(question_id: str):
    client = ensure_supabase()
    try:
        await client.delete("zhihu_question_stats", {"question_id": f"eq.{question_id}"})
        await client.delete("zhihu_question_keywords", {"question_id": f"eq.{question_id}"})
        await client.delete("zhihu_questions", {"id": f"eq.{question_id}"})
    except SupabaseError as exc:
        raise HTTPException(status_code=500, detail=str(exc.message))
    return {"status": "ok"}


@app.get("/api/zhihu/questions/{question_id}/stats")
async def get_zhihu_question_stats(question_id: str, days: int = 15):
    client = ensure_supabase()
    rows = await client.select("zhihu_question_stats", {"question_id": f"eq.{question_id}", "order": "stat_date.asc", "limit": days})
    return {"stats": rows}


@app.post("/api/zhihu/scrape/run")
async def run_zhihu_scrape(payload: Optional[ZhihuScrapeRunPayload] = None, dry_run: bool = False):
    keyword_id = payload.keyword_id if payload else None
    job_state = create_zhihu_job_state(total=0, keyword_id=keyword_id)
    job_id = job_state["id"]
    if not dry_run:
        asyncio.create_task(
            zhihu_scrape_job(keyword_id=keyword_id, include_existing=True, job_id=job_id)
        )
    return {"status": "queued", "job_id": job_id}


@app.get("/api/zhihu/scrape/status/{job_id}")
async def get_zhihu_scrape_status(job_id: str):
    state = get_zhihu_job_state(job_id)
    if not state:
        raise HTTPException(status_code=404, detail="任务不存在")
    return state


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

    backend_host = os.getenv("BACKEND_HOST", "0.0.0.0")
    backend_port = int(os.getenv("BACKEND_PORT", os.getenv("PORT", "8000")))

    uvicorn.run(app, host=backend_host, port=backend_port)

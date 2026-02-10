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
import logging
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
from backend.services.cache import cache



# 加载环境变量

load_dotenv()


logger = logging.getLogger(__name__)


# ==================== Request Models ====================

class SourcingItemsByIdsRequest(BaseModel):
    ids: Optional[List[str]] = None


class SourcingCategoryCreate(BaseModel):
    name: str
    color: Optional[str] = None
    spec_fields: Optional[List[Dict[str, Any]]] = None
    sort_order: Optional[int] = None
    parent_id: Optional[str] = None


class SourcingCategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    spec_fields: Optional[List[Dict[str, Any]]] = None
    sort_order: Optional[int] = None
    parent_id: Optional[str] = None


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

CACHE_NS_BLUE_LINK_MAP = "blue_link_map"
CACHE_NS_SOURCING_CATEGORY_COUNT = "sourcing_category_count"
CACHE_NS_ZHIHU_KEYWORDS = "zhihu_keywords"
CACHE_NS_SOURCING_ITEMS = "sourcing_items"

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
    cache.invalidate(CACHE_NS_ZHIHU_KEYWORDS)


async def fetch_zhihu_keywords_map(client: SupabaseClient, force: bool = False) -> Dict[str, str]:
    cached = cache.get(CACHE_NS_ZHIHU_KEYWORDS, ttl=ZHIHU_KEYWORDS_MAP_CACHE_TTL_SECONDS)
    if not force and cached is not None:
        return cached
    rows = await client.select("zhihu_keywords", params={"select": "id,name"})
    payload = {str(row.get("id")): row.get("name") or "" for row in rows}
    cache.set(CACHE_NS_ZHIHU_KEYWORDS, data=payload)
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
    offsets = list(range(0, 60, 20))
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
    params = {"include": "visit_count,answer_count"}
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
    offsets = list(range(0, 60, 20))
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

        logger.info("[Supabase] 已启用")

    else:

        logger.info("[Supabase] 未配置，相关模块将退化为本地模式")

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

        logger.info(f"[WBI] 获取密钥失败: {e}")



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

            logger.info(f"[WBI] 调用 subtitle 接口失败: {e}")

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

        logger.info(f"[Cookie] 写入失败: {e}")

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
    url: str = Field(..., description="B 站 API 地址")


async def handle_bilibili_proxy(url: str):
    """代理请求 B 站 API，绕过浏览器 CORS 限制。"""
    if not url or "bilibili.com" not in url:
        raise HTTPException(status_code=400, detail="请提供有效的 B 站 API 地址")

    headers = build_bilibili_headers({"Accept": "application/json"})

    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
                data = await response.json()
                # 调试日志走 logger，避免控制台编码问题
                logger.debug(f"[B站代理] URL: {url}")
                logger.debug(f"[B站代理] 响应 code: {data.get('code')}")
                if 'data' in data:
                    d = data['data']
                    keys = list(d.keys()) if isinstance(d, dict) else type(d)
                    logger.debug(f"[B站代理] data.keys: {keys}")
                    # top/upper 可能包含 emoji，使用 repr 避免日志打印失败
                    logger.debug(f"[B站代理] data.top: {repr(d.get('top'))[:100]}")
                    logger.debug(f"[B站代理] data.upper: {repr(d.get('upper'))[:100]}")

                # B 站 API 业务错误时不直接抛 4xx，前端统一按 code 处理
                bili_code = data.get('code')
                if bili_code and bili_code != 0:
                    logger.debug(f"[B站代理] B站API业务错误: {bili_code}, message: {data.get('message', '未知错误')}")

                return JSONResponse(content=data)
        except Exception as e:
            logger.debug(f"[B站代理] 请求失败: {e}")
            # 为兼容前端历史逻辑，网络异常时仍返回 200 + code=-1
            return JSONResponse(
                status_code=200,
                content={"code": -1, "message": f"请求失败: {str(e)}", "data": None}
            )





# ==================== 京东商品 API 代理 ====================








class JdImageRequest(BaseModel):

    url: str = Field(..., description="京东商品链接")











TAOBAO_API_BASE = "https://eco.taobao.com/router/rest"


def _taobao_timestamp() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def build_taobao_signed_params(method: str, params: Dict[str, Any]) -> Dict[str, str]:
    if not TAOBAO_APP_KEY or not TAOBAO_APP_SECRET:
        raise HTTPException(status_code=500, detail="缺少淘宝开放平台 app_key/app_secret")
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

                logger.debug(f"[B站解析] 最终URL: {final_url}")



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

        logger.debug(f"[B站解析] 解析失败: {e}")

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

        logger.debug(f"[B字幕API] 获取失败: {e}")

        return None










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

        logger.info(f"[字幕缓存] 读取失败: {e}")

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

        logger.info(f"[字幕缓存] 写入失败: {e}")





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










# ==================== 字幕提取 ====================








# ==================== DeepSeek 语义分段 ====================





async def ai_fill_product_params(
    category_name: str,
    spec_fields: List[Dict[str, Any]],
    product_names: List[str],
    model_override: Optional[str] = None
) -> List[Dict[str, str]]:
    """根据商品名称和预设字段，调用大模型返回参数"""
    use_deepseek = bool(model_override and "deepseek" in model_override.lower())
    use_bigmodel = bool(model_override and model_override.lower().startswith("glm-4.7"))
    deepseek_api_key = DEEPSEEK_API_KEY or os.getenv("DEEPSEEK_API_KEY", "")
    if use_deepseek:
        if not deepseek_api_key or not deepseek_client:
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
        logger.debug('[AI_PARAMS_RAW] %s', content[:2000])
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
        "parent_id": row.get("parent_id"),
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
    cached = cache.get(CACHE_NS_SOURCING_CATEGORY_COUNT, ttl=SOURCING_CATEGORY_COUNT_TTL_SECONDS)
    if not force and cached is not None:
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
    cache.set(CACHE_NS_SOURCING_CATEGORY_COUNT, data=payload)
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

    cached = cache.get(CACHE_NS_SOURCING_ITEMS, key=cache_key, ttl=CACHE_TTL_SECONDS)

    if cached is not None:

        return cached

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

    cache.set(
        CACHE_NS_SOURCING_ITEMS,
        key=cache_key,
        data=payload,
        max_entries=SOURCING_ITEMS_CACHE_LIMIT,
    )

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

    use_cache = not product_ids
    cached = cache.get(CACHE_NS_BLUE_LINK_MAP, ttl=BLUE_LINK_MAP_CACHE_TTL_SECONDS)

    if use_cache and cached is not None:

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
        cache.set(CACHE_NS_BLUE_LINK_MAP, data=payload)

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

        logger.info(f"删除旧封面失败: {exc}")



































ACCOUNT_VIDEO_STAT_CONCURRENCY = 6




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


































































































def _normalize_pub_time(value: Optional[Any]) -> Optional[str]:

    if value is None:

        return None

    if isinstance(value, (int, float)):

        return datetime.fromtimestamp(value, tz=timezone.utc).isoformat()

    if isinstance(value, str):

        return value

    return None



try:
    from backend.api import (
        sourcing,
        schemes,
        comment,
        commission,
        zhihu,
        bilibili,
        video,
        benchmark,
        blue_link_map,
        direct_plans,
    )
except Exception:
    from api import (  # type: ignore
        sourcing,
        schemes,
        comment,
        commission,
        zhihu,
        bilibili,
        video,
        benchmark,
        blue_link_map,
        direct_plans,
    )

app.include_router(sourcing.router)
app.include_router(schemes.router)
app.include_router(comment.router)
app.include_router(commission.router)
app.include_router(zhihu.router)
app.include_router(bilibili.router)
app.include_router(video.router)
app.include_router(benchmark.router)
app.include_router(blue_link_map.router)
app.include_router(direct_plans.router)

try:
    from backend.api.blue_link_map import (
        batch_upsert_blue_link_map_entries,
        patch_blue_link_map_entry,
    )
    from backend.api.commission import taobao_resolve
    from backend.api.zhihu import create_zhihu_question, list_zhihu_questions
except Exception:
    from api.blue_link_map import (  # type: ignore
        batch_upsert_blue_link_map_entries,
        patch_blue_link_map_entry,
    )
    from api.commission import taobao_resolve  # type: ignore
    from api.zhihu import create_zhihu_question, list_zhihu_questions  # type: ignore


@app.get("/api/health")
async def health_check():
    """服务健康检查。"""

    return {
        "status": "ok",
        "services": {
            "deepseek": bool(DEEPSEEK_API_KEY),
            "dashscope": bool(DASHSCOPE_API_KEY),
            "rembg": rembg_session is not None,
        },
    }

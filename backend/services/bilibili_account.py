from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Any, Awaitable, Callable, Dict, List, Optional
from uuid import uuid4

import aiohttp
from fastapi import HTTPException
from playwright.async_api import async_playwright
from zoneinfo import ZoneInfo

logger = logging.getLogger(__name__)

BILIBILI_SPACE_WEB_LOCATION = "333.1387"
BILIBILI_DM_IMG_LIST = "[]"
BILIBILI_DM_IMG_STR = "V2ViR0wgMS4wIChPcGVuR0wgRVMgMi4wIENocm9taXVtKQ"
BILIBILI_DM_COVER_IMG_STR = (
    "QU5HTEUgKE5WSURJQSwgTlZJRElBIEdlRm9yY2UgUlRYIDMwODAgKDB4MDAwMDIyMTYp"
    "IERpcmVjdDNEMTEgdnNfNV8wIHBzXzVfMCwgRDNEMTEpR29vZ2xlIEluYy4gKE5WSURJQS"
)
BILIBILI_DM_IMG_INTER = '{"ds":[],"wh":[4633,4831,31],"of":[283,566,283]}'

FetchWbiKeysFn = Callable[..., Awaitable[Optional[Dict[str, str]]]]
EncodeWbiParamsFn = Callable[[Dict[str, str], str, str], Dict[str, str]]
BuildHeadersFn = Callable[[Optional[Dict[str, str]]], Dict[str, str]]


RISK_ERROR_KEYWORDS = (
    "\u8bf7\u6c42\u8fc7\u4e8e\u9891\u7e41",
    "\u98ce\u63a7\u6821\u9a8c",
    "v_voucher",
    "\\u8bf7\\u6c42\\u8fc7\\u4e8e\\u9891\\u7e41",
    "\\u98ce\\u63a7\\u6821\\u9a8c",
    "risk control",
    "too many requests",
)


RISK_ERROR_DECODED_KEYWORDS = (
    "\u8bf7\u6c42\u8fc7\u4e8e\u9891\u7e41",
    "\u98ce\u63a7\u6821\u9a8c",
)


def is_risk_error_message(message: str) -> bool:
    text = str(message or "")
    if not text:
        return False

    lowered = text.lower()
    if any(keyword in text for keyword in RISK_ERROR_KEYWORDS[:5]):
        return True
    if any(keyword in lowered for keyword in RISK_ERROR_KEYWORDS[5:]):
        return True

    if "\\u" in text:
        try:
            decoded = text.encode("utf-8").decode("unicode_escape")
        except Exception:
            decoded = ""
        if decoded and decoded != text and any(
            token in decoded for token in RISK_ERROR_DECODED_KEYWORDS
        ):
            return True

    return False


def build_bilibili_dm_img_inter() -> str:
    seed = int(time.time() * 1000) + (uuid4().int % 997)
    width = 4200 + (seed % 800)
    height = 4400 + ((seed // 7) % 700)
    ratio = 20 + ((seed // 13) % 80)
    offset = 200 + ((seed // 17) % 300)
    payload = {
        "ds": [],
        "wh": [width, height, ratio],
        "of": [offset, offset * 2, offset],
    }
    return json.dumps(payload, separators=(",", ":"))


def build_bilibili_space_arc_search_params(
    mid: str,
    page: int,
    page_size: int,
    *,
    dm_img_inter: Optional[str] = None,
) -> Dict[str, str]:
    return {
        "mid": str(mid),
        "pn": str(page),
        "ps": str(page_size),
        "tid": "0",
        "special_type": "",
        "order": "pubdate",
        "index": "0",
        "keyword": "",
        "order_avoided": "true",
        "platform": "web",
        "web_location": BILIBILI_SPACE_WEB_LOCATION,
        "dm_img_list": BILIBILI_DM_IMG_LIST,
        "dm_img_str": BILIBILI_DM_IMG_STR,
        "dm_cover_img_str": BILIBILI_DM_COVER_IMG_STR,
        "dm_img_inter": dm_img_inter or build_bilibili_dm_img_inter(),
    }


async def build_bilibili_runtime_cookie(
    session: aiohttp.ClientSession,
    headers: Dict[str, str],
    *,
    bilibili_cookie: str,
) -> Optional[str]:
    if bilibili_cookie:
        return bilibili_cookie

    cookies: Dict[str, str] = {}
    try:
        async with session.get(
            "https://api.bilibili.com/x/frontend/finger/spi",
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=10),
        ) as resp:
            data = await resp.json(content_type=None)
        if isinstance(data, dict):
            spi_data = data.get("data") or {}
            if isinstance(spi_data, dict):
                buvid3 = str(spi_data.get("b_3") or "").strip()
                buvid4 = str(spi_data.get("b_4") or "").strip()
                if buvid3:
                    cookies["buvid3"] = buvid3
                if buvid4:
                    cookies["buvid4"] = buvid4
    except Exception as exc:
        logger.info("[Bili] fingerprint request failed: %s", exc)

    cookies.setdefault("b_nut", str(int(time.time())))
    cookies.setdefault("_uuid", f"{uuid4().hex.upper()}infoc")

    cookie_text = "; ".join(
        f"{key}={value}" for key, value in cookies.items() if value
    )
    return cookie_text or None


async def fetch_bilibili_runtime_cookie_from_space_page(mid: str) -> Optional[str]:
    target_url = f"https://space.bilibili.com/{mid}/upload/video"
    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/144.0.0.0 Safari/537.36"
                ),
                locale="zh-CN",
            )
            page_obj = await context.new_page()
            await page_obj.goto(target_url, wait_until="domcontentloaded", timeout=25000)
            await page_obj.wait_for_timeout(7000)
            cookie_text = str(await page_obj.evaluate("() => document.cookie || ''")).strip()
            await context.close()
            await browser.close()
    except Exception as exc:
        logger.info("[Bili] browser cookie fetch failed: %s", exc)
        return None

    if not cookie_text:
        return None

    if "_uuid=" not in cookie_text:
        cookie_text = f"{cookie_text}; _uuid={uuid4().hex.upper()}infoc"

    return cookie_text


async def fetch_account_videos_from_space_page(
    mid: str,
    page: int = 1,
    page_size: int = 20,
) -> List[Dict[str, Any]]:
    target_page = max(1, int(page or 1))
    query = f"?page={target_page}" if target_page > 1 else ""
    target_url = f"https://space.bilibili.com/{mid}/upload/video{query}"

    try:
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/144.0.0.0 Safari/537.36"
                ),
                locale="zh-CN",
            )
            page_obj = await context.new_page()
            await page_obj.goto(target_url, wait_until="domcontentloaded", timeout=25000)
            await page_obj.wait_for_selector(".bili-video-card", timeout=15000)
            rows = await page_obj.evaluate(
                r"""
                (limit) => {
                  const cards = Array.from(document.querySelectorAll('.bili-video-card'));
                  const results = [];
                  for (const card of cards) {
                    if (results.length >= limit) break;
                    const cover = card.querySelector('a.bili-cover-card');
                    const titleLink = card.querySelector('.bili-video-card__title a[href*="/video/"]');
                    const hrefRaw = (titleLink?.getAttribute('href') || cover?.getAttribute('href') || '').trim();
                    const href = hrefRaw.startsWith('//') ? `https:${hrefRaw}` : hrefRaw;
                    const bvidMatch = href.match(/\/video\/(BV[0-9A-Za-z]+)/);
                    const bvid = bvidMatch ? bvidMatch[1] : '';
                    if (!bvid) continue;

                    let coverUrl = cover?.querySelector('img')?.getAttribute('src') || '';
                    if (coverUrl.startsWith('//')) {
                      coverUrl = `https:${coverUrl}`;
                    }

                    const stats = Array.from(
                      card.querySelectorAll('.bili-cover-card__stats .bili-cover-card__stat span')
                    )
                      .map((node) => (node.textContent || '').trim())
                      .filter(Boolean);

                    results.push({
                      bvid,
                      title: (titleLink?.textContent || cover?.querySelector('img')?.getAttribute('alt') || '').trim(),
                      link: href,
                      pic: coverUrl,
                      play: stats[0] || '',
                      comment: stats[1] || '',
                      length: stats[2] || '',
                      date_text: (card.querySelector('.bili-video-card__subtitle span')?.textContent || '').trim(),
                    });
                  }
                  return results;
                }
                """,
                max(1, int(page_size or 1)),
            )
            await context.close()
            await browser.close()
    except Exception as exc:
        logger.info("[Bili] space page scrape failed: %s", exc)
        return []

    items: List[Dict[str, Any]] = []
    for row in rows or []:
        if not isinstance(row, dict):
            continue
        bvid = str(row.get("bvid") or "").strip()
        if not bvid:
            continue
        item: Dict[str, Any] = {
            "bvid": bvid,
            "title": str(row.get("title") or "").strip(),
            "link": str(row.get("link") or "").strip(),
            "pic": str(row.get("pic") or "").strip(),
            "play": row.get("play"),
            "comment": row.get("comment"),
            "length": row.get("length"),
        }
        date_text = str(row.get("date_text") or "").strip()
        if date_text:
            try:
                published_at = datetime.strptime(date_text, "%Y-%m-%d").replace(
                    tzinfo=ZoneInfo("Asia/Shanghai")
                )
                item["created"] = int(published_at.timestamp())
            except Exception:
                pass
        items.append(item)
    return items


async def fetch_account_videos_from_bili(
    mid: str,
    page: int = 1,
    page_size: int = 20,
    session: Optional[aiohttp.ClientSession] = None,
    *,
    fetch_wbi_keys_fn: FetchWbiKeysFn,
    encode_wbi_params_fn: EncodeWbiParamsFn,
    build_bilibili_headers_fn: BuildHeadersFn,
    bilibili_cookie: str,
) -> List[Dict[str, Any]]:
    keys = await fetch_wbi_keys_fn()
    if not keys:
        raise HTTPException(status_code=500, detail="Failed to fetch Bilibili WBI keys")

    url = "https://api.bilibili.com/x/space/wbi/arc/search"
    headers = build_bilibili_headers_fn(
        {
            "Referer": f"https://space.bilibili.com/{mid}/upload/video",
            "Origin": "https://space.bilibili.com",
        }
    )

    async def request(
        current_session: aiohttp.ClientSession,
        *,
        dm_img_inter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        params = build_bilibili_space_arc_search_params(
            mid,
            page,
            page_size,
            dm_img_inter=dm_img_inter or build_bilibili_dm_img_inter(),
        )
        signed_params = encode_wbi_params_fn(
            params,
            keys.get("img_key", ""),
            keys.get("sub_key", ""),
        )
        async with current_session.get(
            url,
            headers=headers,
            params=signed_params,
            timeout=aiohttp.ClientTimeout(total=12),
        ) as resp:
            data = await resp.json(content_type=None)
            if data.get("code") != 0:
                message = data.get("message") or "Failed to fetch account videos"
                raise RuntimeError(message)
            return data.get("data", {}).get("list", {}).get("vlist", []) or []

    last_error: Optional[Exception] = None
    risk_error_detected = False

    for attempt in range(6):
        try:
            if session:
                if not headers.get("Cookie"):
                    runtime_cookie = await build_bilibili_runtime_cookie(
                        session,
                        headers,
                        bilibili_cookie=bilibili_cookie,
                    )
                    if runtime_cookie:
                        headers["Cookie"] = runtime_cookie
                return await request(session)

            async with aiohttp.ClientSession() as local_session:
                if not headers.get("Cookie"):
                    runtime_cookie = await build_bilibili_runtime_cookie(
                        local_session,
                        headers,
                        bilibili_cookie=bilibili_cookie,
                    )
                    if runtime_cookie:
                        headers["Cookie"] = runtime_cookie
                return await request(local_session)
        except Exception as exc:
            last_error = exc
            message = str(exc)
            risk_error_detected = is_risk_error_message(message)
            keys = await fetch_wbi_keys_fn(force=True) or keys
            headers.pop("Cookie", None)

            if attempt < 5:
                if risk_error_detected:
                    await asyncio.sleep(min(0.25 * (attempt + 1), 1.0))
                continue

    if risk_error_detected and not bilibili_cookie:
        browser_cookie = await fetch_bilibili_runtime_cookie_from_space_page(mid)
        if browser_cookie:
            headers["Cookie"] = browser_cookie
            for retry in range(2):
                try:
                    keys = await fetch_wbi_keys_fn(force=True) or keys
                    if session:
                        return await request(session, dm_img_inter=BILIBILI_DM_IMG_INTER)
                    async with aiohttp.ClientSession() as local_session:
                        return await request(local_session, dm_img_inter=BILIBILI_DM_IMG_INTER)
                except Exception as exc:
                    last_error = exc
                    if retry == 0:
                        await asyncio.sleep(0.3)

    if risk_error_detected:
        fallback_items = await fetch_account_videos_from_space_page(mid, page, page_size)
        if fallback_items:
            return fallback_items

    error_text = str(last_error) if last_error else "Unknown error"
    raise HTTPException(status_code=500, detail=f"Failed to fetch account videos: {error_text}")


async def fetch_account_video_stat(
    bvid: str,
    session: Optional[aiohttp.ClientSession] = None,
    *,
    build_bilibili_headers_fn: BuildHeadersFn,
) -> Optional[Dict[str, Any]]:
    if not bvid:
        return None

    trimmed = str(bvid).strip()
    if not trimmed:
        return None

    headers = build_bilibili_headers_fn({"Referer": "https://www.bilibili.com/"})
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

const normalizeLine = (value) =>
  String(value || "")
    .replace(/[\u200b-\u200f\u202a-\u202e]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeTextBlock = (value) => {
  const raw = String(value || "").replace(/\r\n/g, "\n");
  const lines = raw
    .split("\n")
    .map((line) => normalizeLine(line))
    .filter(Boolean);
  return lines.join("\n");
};

const toNumber = (raw) => {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).replace(/[,\s]/g, "").trim();
  if (!text) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
};

const normalizeImageUrl = (raw) => {
  if (!raw) return "";
  let value = String(raw)
    .trim()
    .replace(/\\u002F/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/&amp;/gi, "&");
  if (!value) return "";
  if (/^(data:|blob:)/i.test(value)) return "";
  if (value.startsWith("//")) {
    value = `${window.location.protocol}${value}`;
  }
  if (value.startsWith("/")) {
    try {
      return new URL(value, window.location.origin).href;
    } catch {
      return "";
    }
  }
  if (/^https?:\/\//i.test(value)) return value;
  return "";
};

const imageScore = (url, scoreBase = 0) => {
  if (!url) return -1;
  let score = scoreBase;
  if (/\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(url)) score += 20;
  if (/(cover|main|detail|item|poster)/i.test(url)) score += 20;
  if (/(avatar|icon|logo|sprite|placeholder)/i.test(url)) score -= 40;
  return score;
};

const findCoverUrl = () => {
  const candidates = [];
  const seen = new Set();

  const pushCandidate = (rawUrl, scoreBase = 0) => {
    const url = normalizeImageUrl(rawUrl);
    if (!url || seen.has(url)) return;
    seen.add(url);
    candidates.push({ url, score: imageScore(url, scoreBase) });
  };

  const metaSelectors = [
    'meta[property="og:image"]',
    'meta[name="og:image"]',
    'meta[name="twitter:image"]',
    'meta[itemprop="image"]',
  ];
  for (const selector of metaSelectors) {
    const tag = document.querySelector(selector);
    pushCandidate(tag?.getAttribute("content"), 90);
  }

  const imgSelectors = [
    'img[data-testid*="img"]',
    'img[class*="cover"]',
    'img[class*="main"]',
    'img[class*="item"]',
    "img",
  ];
  for (const selector of imgSelectors) {
    const nodes = Array.from(document.querySelectorAll(selector));
    for (const node of nodes) {
      const src = node.currentSrc || node.src || node.getAttribute("data-src") || "";
      const width =
        Number(node.naturalWidth || node.width || node.getAttribute("width") || 0) || 0;
      const height =
        Number(node.naturalHeight || node.height || node.getAttribute("height") || 0) || 0;
      const areaScore = Math.min(Math.floor((width * height) / 2000), 120);
      pushCandidate(src, 20 + areaScore);
    }
  }

  const scripts = Array.from(document.querySelectorAll("script"));
  for (const script of scripts) {
    const text = String(script.textContent || "");
    if (!text) continue;
    const pattern =
      /"(?:mainPic|main_pic|itemPic|item_pic|picUrl|pic_url|image|imgUrl|coverUrl)"\s*:\s*"([^"]+)"/gi;
    let match;
    while ((match = pattern.exec(text))) {
      pushCandidate(match[1], 40);
    }
  }

  if (!candidates.length) return "";
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].url;
};

const readTextFromDocument = (doc) => {
  if (!doc || !doc.body) return "";
  const fromInnerText = normalizeTextBlock(doc.body.innerText || "");
  if (fromInnerText) return fromInnerText;
  return normalizeTextBlock(doc.body.textContent || "");
};

const collectTextBlocks = () => {
  const blocks = [];

  const mainText = readTextFromDocument(document);
  if (mainText) blocks.push(mainText);

  const titleSelectors = [
    "h1",
    "h2",
    "[class*='title']",
    "[class*='name']",
    "[data-testid*='title']",
  ];
  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    const text = normalizeTextBlock(element?.textContent || "");
    if (text && text.length >= 4) {
      blocks.push(text);
    }
  }

  const frames = Array.from(document.querySelectorAll("iframe"));
  for (const frame of frames) {
    try {
      const frameDoc = frame.contentDocument;
      const text = readTextFromDocument(frameDoc);
      if (text) {
        blocks.push(text);
      }
    } catch {
      // Ignore cross-origin iframe.
    }
  }

  return Array.from(new Set(blocks.filter(Boolean)));
};

const pickNumber = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match) continue;
    const value = toNumber(match[1]);
    if (value !== null) return value;
  }
  return null;
};

const findTitle = (text) => {
  const lines = text
    .split(/\n+/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);

  const dailyLine = lines.find((line) => /日\s*推广量\s*[:：]\s*\d+/.test(line));
  if (dailyLine) {
    const candidate = normalizeLine(
      dailyLine
        .replace(/^(天猫|淘宝)\s*/i, "")
        .replace(/\s*日\s*推广量\s*[:：]\s*\d+.*/i, "")
        .replace(/^热销\s*/i, "")
    );
    if (candidate.length >= 4) {
      return candidate;
    }
  }

  const titleMatch = text.match(/(?:天猫|淘宝)?\s*([^\n]{4,160}?)\s+日\s*推广量\s*[:：]\s*\d+/i);
  if (titleMatch && titleMatch[1]) {
    const candidate = normalizeLine(titleMatch[1]);
    if (candidate.length >= 4) {
      return candidate;
    }
  }

  const navPattern = /(首页|我要推广|活动中心|我的工具|推广管理|数据报表|我的账户|淘宝联盟|生态伙伴)/;
  for (const line of lines) {
    if (line.length < 6 || line.length > 160) continue;
    if (navPattern.test(line)) continue;
    if (/价格|佣金|销量|推广|优惠|加入收藏|立即推广/.test(line)) continue;
    return line;
  }

  const docTitle = normalizeLine(document.title).replace(/[-|_].*$/, "").trim();
  if (docTitle && docTitle !== "淘宝联盟") {
    return docTitle;
  }
  return "";
};

const findSales30 = (text) => {
  const direct = pickNumber(text, [
    /月[\s\S]{0,40}?推广销量[^\d]{0,10}([0-9][0-9,]{1,})/i,
    /月\s*推广销量[^\d]{0,10}([0-9][0-9,]{1,})/i,
    /月销量[^\d]{0,10}([0-9][0-9,]{1,})(?!\s*[a-zA-Z])/i,
  ]);
  if (direct !== null) {
    return direct;
  }

  const lines = text
    .split(/\n+/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!/(^月$|^月\s|\s月\s|\(月\))/i.test(line) && line !== "月") {
      continue;
    }
    const section = lines.slice(index, index + 8).join(" ");
    const value = pickNumber(section, [/推广销量[^\d]{0,10}([0-9][0-9,]{1,})/i]);
    if (value !== null) {
      return value;
    }
  }

  return null;
};

const extractProductData = () => {
  const href = window.location.href;
  const url = new URL(href);

  const blocks = collectTextBlocks();
  const mergedText = blocks.join("\n");
  const lines = mergedText
    .split(/\n+/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);

  const title = findTitle(mergedText);
  const price = pickNumber(mergedText, [
    /到手价[^\d]{0,16}([0-9]+(?:\.[0-9]+)?)/i,
    /券后价[^\d]{0,16}([0-9]+(?:\.[0-9]+)?)/i,
    /价格[^\d]{0,12}([0-9]+(?:\.[0-9]+)?)/i,
  ]);
  const commissionRate = pickNumber(mergedText, [
    /佣金(?:率|比例)?[^\d%]{0,20}([0-9]+(?:\.[0-9]+)?)\s*%/i,
    /钩佣佣金率[^\d%]{0,20}([0-9]+(?:\.[0-9]+)?)\s*%/i,
  ]);
  const commission = null;
  const sales30 = findSales30(mergedText);
  const coverUrl = findCoverUrl();

  return {
    title,
    price,
    commission,
    commissionRate,
    sales30,
    coverUrl,
    alimamaItemId: url.searchParams.get("itemId") || "",
    promoLink: href,
    pageUrl: href,
    extractedAt: new Date().toISOString(),
    debug: {
      textBlockCount: blocks.length,
      sampleLines: lines.slice(0, 10),
    },
  };
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "extract-alimama") {
    return;
  }

  try {
    const data = extractProductData();
    sendResponse({ ok: true, data });
  } catch (error) {
    sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Failed to extract page data",
    });
  }

  return true; // 保持消息通道开放
});

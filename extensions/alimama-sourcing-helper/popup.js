const DEFAULT_BASE_URL = "http://127.0.0.1:8000";

const REQUIRED_CREATE_FIELDS = new Set(["title", "promoLink"]);

const FIELD_DEFS = [
  {
    key: "title",
    label: "商品标题",
    source: "title",
    target: "title",
    type: "string",
  },
  {
    key: "coverUrl",
    label: "封面",
    source: "coverUrl",
    target: "cover_url",
    type: "string",
  },
  {
    key: "price",
    label: "淘宝价格",
    source: "price",
    target: "tb_price",
    type: "number",
  },
  {
    key: "commission",
    label: "淘宝佣金",
    source: "commission",
    target: "tb_commission",
    type: "number",
  },
  {
    key: "commissionRate",
    label: "淘宝佣金比例",
    source: "commissionRate",
    target: "tb_commission_rate",
    type: "number",
  },
  {
    key: "sales30",
    label: "淘宝月销量",
    source: "sales30",
    target: "tb_sales",
    type: "number",
  },
  {
    key: "promoLink",
    label: "淘宝推广链接",
    source: "promoLink",
    target: "spec._tb_promo_link",
    type: "string",
  },
  {
    key: "taobaoLink",
    label: "淘宝商品链接",
    source: "taobaoLink",
    target: "taobao_link",
    type: "string",
  },
];

const state = {
  backendBase: DEFAULT_BASE_URL,
  mode: "update",
  previewRows: [],
  previewTargetItem: null,
  categories: [],
  activeParentCategoryId: "",
};

const refs = {
  extractBtn: document.getElementById("extractBtn"),
  statusText: document.getElementById("statusText"),
  extractFields: document.getElementById("extractFields"),
  titleInput: document.getElementById("titleInput"),
  coverInput: document.getElementById("coverInput"),
  priceInput: document.getElementById("priceInput"),
  commissionInput: document.getElementById("commissionInput"),
  rateInput: document.getElementById("rateInput"),
  salesInput: document.getElementById("salesInput"),
  promoLinkInput: document.getElementById("promoLinkInput"),
  taobaoLinkInput: document.getElementById("taobaoLinkInput"),
  updatePanel: document.getElementById("updatePanel"),
  createPanel: document.getElementById("createPanel"),
  itemSearchInput: document.getElementById("itemSearchInput"),
  searchItemBtn: document.getElementById("searchItemBtn"),
  itemSelect: document.getElementById("itemSelect"),
  updateHint: document.getElementById("updateHint"),
  parentCategorySelect: document.getElementById("parentCategorySelect"),
  categorySelect: document.getElementById("categorySelect"),
  previewBtn: document.getElementById("previewBtn"),
  submitBtn: document.getElementById("submitBtn"),
  previewList: document.getElementById("previewList"),
};

const setStatus = (message, kind = "info") => {
  refs.statusText.textContent = message;
  refs.statusText.style.color =
    kind === "error" ? "#dc2626" : kind === "success" ? "#15803d" : "#64748b";
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const hasExtractValue = (value) => value !== null && value !== undefined && String(value).trim() !== "";

const isExtractionUseful = (data) => {
  if (!data || typeof data !== "object") return false;
  const hasTitle = hasExtractValue(data.title);
  const hasNumber = [data.price, data.commission, data.commissionRate, data.sales30].some(
    (value) => value !== null && value !== undefined && Number.isFinite(Number(value))
  );
  const hasLink = [data.coverUrl, data.promoLink, data.taobaoLink].some((value) =>
    hasExtractValue(value)
  );
  return hasTitle || hasNumber || hasLink;
};

const sendRuntimeMessage = async (message) => {
  return await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(response);
    });
  });
};

const sendTabMessage = async (tabId, message) => {
  return await new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      resolve(response);
    });
  });
};

const getActiveTab = async () => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
};

const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return !Number.isFinite(value) || value === 0;
  const text = String(value).trim();
  if (!text) return true;
  const numeric = Number(text.replace(/,/g, ""));
  if (Number.isFinite(numeric) && numeric === 0) return true;
  return false;
};

const parseInputNumber = (value) => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  if (!text) return null;
  const normalized = text.replace(/[%％,\s]/g, "");
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
};

const computeCommissionFromInputs = (priceRaw, rateRaw) => {
  const price = parseInputNumber(priceRaw);
  const rate = parseInputNumber(rateRaw);
  if (price === null || rate === null) return null;
  return Number(((price * rate) / 100).toFixed(2));
};

const syncCommissionInput = () => {
  const commission = computeCommissionFromInputs(refs.priceInput.value, refs.rateInput.value);
  refs.commissionInput.value = commission === null ? "" : String(commission);
  return commission;
};

const normalizeFieldValue = (def, rawValue) => {
  if (def.type === "number") return parseInputNumber(rawValue);
  return String(rawValue || "").trim();
};

const formatValue = (value) => {
  if (value === null || value === undefined) return "(空)";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "(空)";
  const text = String(value).trim();
  return text || "(空)";
};

const readExtractedData = () => {
  const commission = syncCommissionInput();
  return {
    title: refs.titleInput.value,
    coverUrl: refs.coverInput.value,
    price: refs.priceInput.value,
    commission: commission === null ? "" : String(commission),
    commissionRate: refs.rateInput.value,
    sales30: refs.salesInput.value,
    promoLink: refs.promoLinkInput.value,
    taobaoLink: refs.taobaoLinkInput.value,
  };
};

const fillExtractedData = (data) => {
  refs.titleInput.value = data.title || "";
  refs.coverInput.value = data.coverUrl || "";
  refs.priceInput.value = data.price === null || data.price === undefined ? "" : String(data.price);
  refs.rateInput.value =
    data.commissionRate === null || data.commissionRate === undefined
      ? ""
      : String(data.commissionRate);
  syncCommissionInput();
  refs.salesInput.value =
    data.sales30 === null || data.sales30 === undefined ? "" : String(data.sales30);
  refs.promoLinkInput.value = data.promoLink || data.pageUrl || "";
  refs.taobaoLinkInput.value = data.taobaoLink || "";
  refs.extractFields.classList.remove("hidden");
  resetPreviewAfterExtractedFieldChanged();
};

const resetPreviewAfterExtractedFieldChanged = () => {
  if (state.previewRows.length) {
    state.previewRows = [];
    state.previewTargetItem = null;
    renderPreview();
    return;
  }
  updateSubmitAvailability();
};

const callApi = async (path, options = {}) => {
  const response = await sendRuntimeMessage({
    type: "api-request",
    payload: {
      baseUrl: state.backendBase,
      path,
      method: options.method || "GET",
      body: options.body,
    },
  });
  if (!response?.ok) {
    throw new Error(response?.error || "API request failed");
  }
  return response.data;
};

const setMode = (mode) => {
  state.mode = mode;
  refs.updatePanel.classList.toggle("hidden", mode !== "update");
  refs.createPanel.classList.toggle("hidden", mode !== "create");
  document.querySelectorAll('input[name="writeMode"]').forEach((input) => {
    input.checked = input.value === mode;
  });
  if (mode === "update") {
    refs.itemSelect.value = "";
    refs.itemSelect.innerHTML = "";
    refs.itemSelect.classList.add("hidden");
    refs.updateHint.classList.add("hidden");
  }
  state.previewRows = [];
  state.previewTargetItem = null;
  renderPreview();
};

const renderItemOptions = (items) => {
  refs.itemSelect.innerHTML = "";
  refs.itemSelect.classList.remove("hidden");
  refs.updateHint.classList.remove("hidden");

  if (!items.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "未找到商品";
    refs.itemSelect.appendChild(option);
    return;
  }

  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    const uidText = item.uid ? `${item.uid} | ` : "";
    option.textContent = `${uidText}${item.title || "未命名商品"}`;
    refs.itemSelect.appendChild(option);
  }
};

const groupCategories = (categories) => {
  const sorted = categories.slice().sort((a, b) => {
    const av = Number(a.sort_order || 0);
    const bv = Number(b.sort_order || 0);
    if (av !== bv) return av - bv;
    return String(a.name || "").localeCompare(String(b.name || ""), "zh-CN");
  });

  const parents = sorted.filter((item) => !item.parent_id);
  const childMap = new Map();

  for (const parent of parents) {
    childMap.set(String(parent.id), []);
  }

  for (const category of sorted) {
    if (!category.parent_id) continue;
    const parentKey = String(category.parent_id);
    if (!childMap.has(parentKey)) {
      childMap.set(parentKey, []);
    }
    childMap.get(parentKey).push(category);
  }

  return { parents, childMap };
};

const renderChildCategoryOptions = (childMap) => {
  refs.categorySelect.innerHTML = "";

  const parentId = state.activeParentCategoryId;
  const children = childMap.get(parentId) || [];

  if (!children.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "暂无二级分类";
    refs.categorySelect.appendChild(option);
    refs.categorySelect.value = "";
    updateSubmitAvailability();
    return;
  }

  for (const child of children) {
    const option = document.createElement("option");
    option.value = String(child.id);
    option.textContent = child.name || "未命名二级分类";
    refs.categorySelect.appendChild(option);
  }

  refs.categorySelect.value = String(children[0].id);
  updateSubmitAvailability();
};

const renderCategoryOptions = (categories) => {
  refs.parentCategorySelect.innerHTML = "";
  refs.categorySelect.innerHTML = "";

  if (!categories.length) {
    const parentOption = document.createElement("option");
    parentOption.value = "";
    parentOption.textContent = "暂无一级分类";
    refs.parentCategorySelect.appendChild(parentOption);

    const childOption = document.createElement("option");
    childOption.value = "";
    childOption.textContent = "暂无二级分类";
    refs.categorySelect.appendChild(childOption);

    state.activeParentCategoryId = "";
    updateSubmitAvailability();
    return;
  }

  const { parents, childMap } = groupCategories(categories);

  if (!parents.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "暂无一级分类";
    refs.parentCategorySelect.appendChild(option);
    state.activeParentCategoryId = "";
    updateSubmitAvailability();
    return;
  }

  for (const parent of parents) {
    const option = document.createElement("option");
    option.value = String(parent.id);
    option.textContent = parent.name || "未命名一级分类";
    refs.parentCategorySelect.appendChild(option);
  }

  const hasActiveParent = parents.some(
    (parent) => String(parent.id) === state.activeParentCategoryId
  );
  state.activeParentCategoryId = hasActiveParent
    ? state.activeParentCategoryId
    : String(parents[0].id);

  refs.parentCategorySelect.value = state.activeParentCategoryId;
  renderChildCategoryOptions(childMap);
};

const getOldValueFromItem = (item, target) => {
  if (!item) return "";
  if (target.startsWith("spec.")) {
    const specKey = target.slice("spec.".length);
    return item.spec && typeof item.spec === "object" ? item.spec[specKey] : "";
  }
  return item[target];
};

const buildPreviewRows = (item) => {
  const extracted = readExtractedData();
  const isCreate = state.mode === "create";

  return FIELD_DEFS.map((def) => {
    const newValue = normalizeFieldValue(def, extracted[def.source]);
    const oldValue = isCreate ? "" : getOldValueFromItem(item, def.target);
    const oldEmpty = isEmptyValue(oldValue);
    const newEmpty = isEmptyValue(newValue);
    const required = isCreate && REQUIRED_CREATE_FIELDS.has(def.key);

    const canApply = isCreate ? !newEmpty : oldEmpty && !newEmpty;
    const locked = required;

    let reason = "可写入";
    if (!canApply && !newEmpty && !isCreate) {
      reason = "已有值，按规则不可覆盖";
    } else if (newEmpty) {
      reason = "抓取值为空";
    }
    if (required && newEmpty) {
      reason = "新增必填项缺失";
    }

    return {
      key: def.key,
      label: def.label,
      target: def.target,
      type: def.type,
      oldValue,
      newValue,
      canApply,
      checked: required ? true : canApply,
      required,
      locked,
      reason,
    };
  });
};

const hasAnyExtractedValue = () => {
  const extracted = readExtractedData();
  return FIELD_DEFS.some((def) => {
    const value = normalizeFieldValue(def, extracted[def.source]);
    return !isEmptyValue(value);
  });
};

const hasCreateRequiredValues = () => {
  const extracted = readExtractedData();
  for (const key of REQUIRED_CREATE_FIELDS) {
    const def = FIELD_DEFS.find((item) => item.key === key);
    if (!def) continue;
    const value = normalizeFieldValue(def, extracted[def.source]);
    if (isEmptyValue(value)) return false;
  }
  return true;
};

const createPreviewMetaLine = (title, value) => {
  const line = document.createElement("div");
  line.className = "meta-line";

  const key = document.createElement("span");
  key.className = "meta-key";
  key.textContent = `${title}：`;

  const content = document.createElement("span");
  content.className = "meta-value";
  content.textContent = formatValue(value);

  line.appendChild(key);
  line.appendChild(content);
  return line;
};

const renderPreview = () => {
  const rows = state.previewRows;
  refs.previewList.innerHTML = "";

  if (!rows.length) {
    refs.previewList.classList.add("hidden");
    updateSubmitAvailability();
    return;
  }

  refs.previewList.classList.remove("hidden");

  rows.forEach((row, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "preview-row";

    const title = document.createElement("div");
    title.className = "title";

    const left = document.createElement("div");
    left.className = "title-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(row.checked);
    checkbox.disabled = row.locked || !row.canApply;
    checkbox.dataset.index = String(index);
    checkbox.addEventListener("change", () => {
      const rowIndex = Number(checkbox.dataset.index);
      if (!Number.isFinite(rowIndex)) return;
      state.previewRows[rowIndex].checked = checkbox.checked;
      updateSubmitAvailability();
    });

    const label = document.createElement("strong");
    label.textContent = row.label;

    const badge = document.createElement("span");
    badge.className = `badge${row.canApply ? "" : " warn"}`;
    badge.textContent = row.reason;

    left.appendChild(checkbox);
    left.appendChild(label);
    title.appendChild(left);
    title.appendChild(badge);

    const meta = document.createElement("div");
    meta.className = "preview-meta";
    meta.appendChild(createPreviewMetaLine("旧值", row.oldValue));
    meta.appendChild(createPreviewMetaLine("新值", row.newValue));

    wrapper.appendChild(title);
    wrapper.appendChild(meta);
    refs.previewList.appendChild(wrapper);
  });

  updateSubmitAvailability();
};

const updateSubmitAvailability = () => {
  const rows = state.previewRows;
  if (!rows.length) {
    if (state.mode === "create") {
      const categoryId = refs.categorySelect.value;
      refs.submitBtn.disabled = !categoryId || !hasCreateRequiredValues() || !hasAnyExtractedValue();
      return;
    }
    const selectedItem = refs.itemSelect.value;
    refs.submitBtn.disabled = !selectedItem || !hasAnyExtractedValue();
    return;
  }
  if (state.mode === "create") {
    const requiredOk = rows
      .filter((row) => row.required)
      .every((row) => row.checked && row.canApply);
    const categoryId = refs.categorySelect.value;
    const hasAnyChecked = rows.some((row) => row.checked && row.canApply);
    refs.submitBtn.disabled = !requiredOk || !categoryId || !hasAnyChecked;
    return;
  }
  const hasChecked = rows.some((row) => row.checked && row.canApply);
  const selectedItem = refs.itemSelect.value;
  refs.submitBtn.disabled = !hasChecked || !selectedItem;
};

const loadCategories = async () => {
  const data = await callApi("/api/sourcing/categories");
  const categories = Array.isArray(data?.categories) ? data.categories : [];
  state.categories = categories;
  renderCategoryOptions(categories);
};

const searchItems = async () => {
  const keyword = String(refs.itemSearchInput.value || "").trim();
  const query = new URLSearchParams({
    limit: "30",
    offset: "0",
    fields: "list",
  });
  if (keyword) query.set("q", keyword);

  const data = await callApi(`/api/sourcing/items?${query.toString()}`);
  const items = Array.isArray(data?.items) ? data.items : [];
  renderItemOptions(items);
};

const fetchSelectedItemDetail = async () => {
  const itemId = refs.itemSelect.value;
  if (!itemId) {
    throw new Error("请先手动选择要更新的商品");
  }
  const data = await callApi(`/api/sourcing/items/${encodeURIComponent(itemId)}`);
  const item = data?.item;
  if (!item) {
    throw new Error("未找到目标商品详情");
  }
  return item;
};

const buildPatchPayload = (item) => {
  const payload = {};
  const specUpdates = {};

  for (const row of state.previewRows) {
    if (!row.checked || !row.canApply) continue;
    if (row.target.startsWith("spec.")) {
      const key = row.target.slice("spec.".length);
      specUpdates[key] = String(row.newValue || "").trim();
      continue;
    }
    payload[row.target] = row.newValue;
  }

  if (Object.keys(specUpdates).length > 0) {
    const currentSpec = item && typeof item.spec === "object" ? item.spec : {};
    payload.spec = { ...currentSpec, ...specUpdates };
  }

  return payload;
};

const buildCreatePayload = () => {
  const payload = {
    category_id: refs.categorySelect.value,
    title: "",
  };
  const spec = {};

  for (const row of state.previewRows) {
    if (!row.checked || !row.canApply) continue;
    if (row.target.startsWith("spec.")) {
      const key = row.target.slice("spec.".length);
      spec[key] = String(row.newValue || "").trim();
      continue;
    }
    payload[row.target] = row.newValue;
  }

  if (Object.keys(spec).length > 0) {
    payload.spec = spec;
  }

  payload.source_type = "manual";
  payload.source_ref = "alimama-plugin";

  return payload;
};

const generatePreview = async () => {
  if (state.mode === "update") {
    const item = await fetchSelectedItemDetail();
    state.previewTargetItem = item;
    state.previewRows = buildPreviewRows(item);
    renderPreview();
    setStatus("预览已生成，请勾选需要写入的字段。", "success");
    return;
  }

  if (!refs.categorySelect.value) {
    throw new Error("请先选择新增目标分类");
  }

  state.previewTargetItem = null;
  state.previewRows = buildPreviewRows(null);
  renderPreview();
  setStatus("预览已生成，请勾选需要写入的字段。", "success");
};

const ensurePreviewRowsForSubmit = async () => {
  if (state.previewRows.length) return;
  if (state.mode === "update") {
    const item = await fetchSelectedItemDetail();
    state.previewTargetItem = item;
    state.previewRows = buildPreviewRows(item);
    return;
  }
  if (!refs.categorySelect.value) {
    throw new Error("请先选择新增目标分类");
  }
  state.previewTargetItem = null;
  state.previewRows = buildPreviewRows(null);
};

const submitWrite = async () => {
  await ensurePreviewRowsForSubmit();
  const checkedRows = state.previewRows.filter((row) => row.checked && row.canApply);
  if (!checkedRows.length) {
    throw new Error("没有可写入字段，请检查抓取值后重试");
  }

  if (state.mode === "update") {
    const itemId = refs.itemSelect.value;
    if (!itemId) {
      throw new Error("请先选择要更新的商品");
    }
    const targetItem = state.previewTargetItem || (await fetchSelectedItemDetail());
    const payload = buildPatchPayload(targetItem);
    if (!Object.keys(payload).length) {
      throw new Error("本次没有可提交的更新字段");
    }
    const result = await callApi(`/api/sourcing/items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      body: payload,
    });
    setStatus(`更新成功：${result?.item?.title || "目标商品"}`, "success");
    return;
  }

  const payload = buildCreatePayload();
  if (!payload.category_id) {
    throw new Error("请先选择新增分类");
  }
  if (!String(payload.title || "").trim()) {
    throw new Error("新增必填项缺失：商品标题");
  }
  if (!payload.spec || !String(payload.spec._tb_promo_link || "").trim()) {
    throw new Error("新增必填项缺失：淘宝推广链接");
  }

  const result = await callApi("/api/sourcing/items", {
    method: "POST",
    body: payload,
  });
  const uid = result?.item?.uid ? `（${result.item.uid}）` : "";
  setStatus(`新增成功：${result?.item?.title || "商品"}${uid}`, "success");
};

const handleExtract = async () => {
  const tab = await getActiveTab();
  if (!tab?.id) {
    throw new Error("未找到当前活动标签页");
  }
  if (!tab.url || !tab.url.includes("pub.alimama.com")) {
    throw new Error("请先切换到阿里妈妈商品详情页");
  }

  let response;
  try {
    response = await sendTabMessage(tab.id, { type: "extract-alimama" });
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content.js"],
    });
    response = await sendTabMessage(tab.id, { type: "extract-alimama" });
  }

  if (!response?.ok) {
    throw new Error(response?.error || "页面抓取失败");
  }

  let data = response.data || {};
  if (!isExtractionUseful(data)) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await delay(500);
      const retry = await sendTabMessage(tab.id, { type: "extract-alimama" });
      if (!retry?.ok) continue;
      data = retry.data || {};
      if (isExtractionUseful(data)) {
        break;
      }
    }
  }

  fillExtractedData(data || {});

  if (!isExtractionUseful(data)) {
    throw new Error("抓取成功，但未提取到有效字段，请手动补充后再写入");
  }

  setStatus("抓取成功", "success");
};

const bindEvents = () => {
  refs.extractBtn.addEventListener("click", async () => {
    try {
      setStatus("正在抓取当前页面...", "info");
      await handleExtract();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "抓取失败", "error");
    }
  });

  refs.searchItemBtn.addEventListener("click", async () => {
    try {
      setStatus("正在搜索商品...", "info");
      await searchItems();
      setStatus("商品列表已更新。", "success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "搜索失败", "error");
    }
  });


  refs.previewBtn.addEventListener("click", async () => {
    try {
      setStatus("正在生成预览...", "info");
      await generatePreview();
    } catch (error) {
      state.previewRows = [];
      renderPreview();
      setStatus(error instanceof Error ? error.message : "生成预览失败", "error");
    }
  });

  refs.submitBtn.addEventListener("click", async () => {
    try {
      if (!window.confirm("确认按当前勾选字段写入数据库吗？")) {
        return;
      }
      refs.submitBtn.disabled = true;
      setStatus("正在写入数据库...", "info");
      await submitWrite();
      state.previewRows = [];
      renderPreview();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "写入失败", "error");
      updateSubmitAvailability();
    }
  });

  refs.priceInput.addEventListener("input", () => {
    syncCommissionInput();
    resetPreviewAfterExtractedFieldChanged();
  });

  refs.rateInput.addEventListener("input", () => {
    syncCommissionInput();
    resetPreviewAfterExtractedFieldChanged();
  });

  [refs.titleInput, refs.coverInput, refs.salesInput, refs.promoLinkInput, refs.taobaoLinkInput].forEach(
    (element) => {
      element.addEventListener("input", () => {
        resetPreviewAfterExtractedFieldChanged();
      });
    }
  );

  refs.itemSelect.addEventListener("change", () => {
    state.previewRows = [];
    state.previewTargetItem = null;
    renderPreview();
  });

  refs.parentCategorySelect.addEventListener("change", () => {
    state.activeParentCategoryId = refs.parentCategorySelect.value;
    const { childMap } = groupCategories(state.categories);
    renderChildCategoryOptions(childMap);
    state.previewRows = [];
    state.previewTargetItem = null;
    renderPreview();
  });

  refs.categorySelect.addEventListener("change", () => {
    updateSubmitAvailability();
  });

  document.querySelectorAll('input[name="writeMode"]').forEach((input) => {
    input.addEventListener("change", async (event) => {
      const value = event.target && event.target.value ? event.target.value : "update";
      setMode(value);
      if (value === "create" && state.categories.length === 0) {
        try {
          await loadCategories();
        } catch {
          // ignore auto load failures; user can click button to retry
        }
      }
      setStatus("写入方式已切换。", "info");
    });
  });
};

const initialize = async () => {
  bindEvents();
  setMode("create");
  syncCommissionInput();

  try {
    await loadCategories();
  } catch {
    // ignore initial category load errors
  }
};

void initialize();

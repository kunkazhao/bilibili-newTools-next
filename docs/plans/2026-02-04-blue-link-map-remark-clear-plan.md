# Blue Link Map Remark + Clear List Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add per-entry remarks, clear-list action, and UI adjustments to the blue-link mapping page in the new project.

**Architecture:** Keep remarks on `blue_link_map_entries` (mapping-level data). Extend backend payloads, update React state to edit/display/copy remarks, and add a clear-list endpoint. UI updates are isolated to the blue-link map module.

**Tech Stack:** FastAPI (backend/main.py), Supabase REST client, React + TypeScript + Tailwind, Vitest.

---

### Task 1: Add remark column via migration

**Files:**
- DB: Supabase migration (run via MCP apply_migration).

**Step 1: Create migration**

SQL:
```sql
alter table blue_link_map_entries
  add column if not exists remark text;
```

**Step 2: Apply migration**

Run (MCP): `supabase.apply_migration` with name `add_blue_link_map_remark`.

**Step 3: Verify**

Query `information_schema.columns` to confirm `remark` exists.

---

### Task 2: Backend payloads + state + clear endpoint

**Files:**
- Modify: `backend/main.py` (BlueLinkMapEntryCreate/Update, normalize, fetch snapshot, batch upsert, patch, new clear endpoint)
- Test: `backend/tests/test_blue_link_routes.py`

**Step 1: Write failing test**

Add route assertion:
```python
self.assertTrue(has_route("/api/blue-link-map/entries/clear", {"POST"}))
```

**Step 2: Run test**

Run: `python -m unittest backend/tests/test_blue_link_routes.py`
Expected: FAIL (route missing).

**Step 3: Implement backend changes**

In `backend/main.py`:
- Add `remark: Optional[str] = None` to:
  ```python
  class BlueLinkMapEntryCreate(BaseModel):
      ...
      remark: Optional[str] = None
  class BlueLinkMapEntryUpdate(BaseModel):
      ...
      remark: Optional[str] = None
  ```
- Normalize:
  ```python
  def normalize_blue_link_map_entry(row):
      return {
          ...
          "remark": row.get("remark"),
      }
  ```
- Fetch snapshot select:
  ```python
  entries_params = {
      "order": "updated_at.desc",
      "select": "id,account_id,category_id,product_id,sku_id,source_link,remark,created_at,updated_at",
  }
  ```
- Batch upsert include remark:
  ```python
  record = {
      ...,
      "remark": (entry.remark or "").strip() or None,
  }
  ```
- Patch endpoint allow remark:
  ```python
  if payload.remark is not None:
      updates["remark"] = (payload.remark or "").strip() or None
  ```
  and in `payload_record`:
  ```python
  "remark": updates.get("remark", existing.get("remark")),
  ```
- Add clear payload + endpoint:
  ```python
  class BlueLinkMapClearPayload(BaseModel):
      account_id: str
      category_id: str

  @app.post("/api/blue-link-map/entries/clear")
  async def clear_blue_link_map_entries(payload: BlueLinkMapClearPayload):
      client = ensure_supabase()
      if not payload.account_id or not payload.category_id:
          raise HTTPException(status_code=400, detail="账号/分类不能为空")
      await client.delete(
          "blue_link_map_entries",
          {"account_id": f"eq.{payload.account_id}", "category_id": f"eq.{payload.category_id}"},
      )
      BLUE_LINK_MAP_CACHE["timestamp"] = 0.0
      BLUE_LINK_MAP_CACHE["data"] = None
      return {"status": "ok"}
  ```

**Step 4: Run tests**

Run: `python -m unittest backend/tests/test_blue_link_routes.py`
Expected: PASS.

---

### Task 3: Frontend types + edit remark state + clear list handler

**Files:**
- Modify: `src/components/blue-link-map/types.ts`
- Modify: `src/components/blue-link-map/BlueLinkMapPageContent.tsx`
- Modify: `src/components/blue-link-map/BlueLinkMapDialogs.tsx`
- Test: `src/components/blue-link-map/BlueLinkMapPageContent.test.tsx`

**Step 1: Write failing test**

In `BlueLinkMapPageContent.test.tsx`, assert that entries are sorted by price and props include new handlers:
```ts
expect(latestViewProps?.visibleEntries?.map((e:any) => e.id)).toEqual(["e1", "e2"])
expect(typeof latestViewProps?.onClearList).toBe("function")
```

**Step 2: Run test**

Run: `npm test -- src/components/blue-link-map/BlueLinkMapPageContent.test.tsx`
Expected: FAIL.

**Step 3: Implement**

- `types.ts`:
  ```ts
  export interface BlueLinkEntry {
    ...
    remark?: string | null
  }
  ```
- `BlueLinkMapPageContent.tsx`:
  - Add state:
    ```ts
    const [editRemark, setEditRemark] = useState("")
    ```
  - In `openEdit`:
    ```ts
    setEditRemark(entry.remark || "")
    ```
  - In `handleEditSubmit`:
    ```ts
    const remark = editRemark.trim() || null
    body: JSON.stringify({ source_link: link, product_id: null, sku_id: null, remark })
    ```
  - Add `handleCopyRemark`:
    ```ts
    const handleCopyRemark = async (entry: BlueLinkEntry) => { ... }
    ```
  - Add clear list handler using confirm dialog:
    ```ts
    const requestClearList = () => openConfirm({
      title: "清空列表",
      description: `确认清空当前分类下的全部蓝链吗？`,
      actionLabel: "确认清空",
      onConfirm: async () => {
        await apiRequest("/api/blue-link-map/entries/clear", {
          method: "POST",
          body: JSON.stringify({ account_id: activeAccountId, category_id: activeCategoryId }),
        })
        await refreshState()
      },
    })
    ```
  - Sorting by price:
    ```ts
    const sortedEntries = useMemo(() => {
      const next = [...filteredEntries]
      next.sort((a, b) => resolvePrice(a) - resolvePrice(b))
      return next
    }, [filteredEntries, itemsVersion])
    ```
    and use `sortedEntries` for chunking.
  - Pass to View/Dialogs:
    ```ts
    onClearList={requestClearList}
    onCopyRemark={handleCopyRemark}
    editRemark={editRemark}
    onEditRemarkChange={setEditRemark}
    ```

- `BlueLinkMapDialogs.tsx`: add remark input in edit dialog:
  ```tsx
  <Input
    aria-label="Edit remark"
    value={editRemark}
    onChange={(e) => onEditRemarkChange(e.target.value)}
    placeholder="请输入备注"
  />
  ```

**Step 4: Run tests**

Run: `npm test -- src/components/blue-link-map/BlueLinkMapPageContent.test.tsx`
Expected: PASS.

---

### Task 4: BlueLinkMap card UI + toolbar buttons

**Files:**
- Modify: `src/components/blue-link-map/BlueLinkMapPageView.tsx`
- Test: `src/components/blue-link-map/BlueLinkMapPageView.test.tsx`

**Step 1: Write failing test**

Add assertions:
```ts
expect(screen.getByText("佣金")).not.toBeNull()
expect(screen.getByText("备注")).not.toBeNull()
```

**Step 2: Run test**

Run: `npm test -- src/components/blue-link-map/BlueLinkMapPageView.test.tsx`
Expected: FAIL.

**Step 3: Implement UI changes**

- Add new props `onClearList`, `onCopyRemark`, `canClearList`.
- Toolbar: insert clear button left of import:
  ```tsx
  <Button variant="outline" onClick={onClearList} disabled={!canClearList}>
    清空列表
  </Button>
  ```
- Update label text:
  ```tsx
  <span>佣金：{formatCommissionRate(...)} </span>
  ```
- Add remark line at bottom:
  ```tsx
  const remark = entry.remark || "--"
  const truncated = truncateText(remark, 20)
  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
    <span>备注：</span>
    <Tooltip content={remark}><span className="truncate">{truncated}</span></Tooltip>
    <Button ... onClick={() => onCopyRemark(entry)}><Copy /></Button>
  </div>
  ```
- Align title + actions by using `items-start` and consistent spacing.

**Step 4: Run tests**

Run: `npm test -- src/components/blue-link-map/BlueLinkMapPageView.test.tsx`
Expected: PASS.

---

### Task 5: Smoke check

**Files:**
- None (manual verification)

**Step 1: Run local dev**
Run: `npm run dev` and open blue-link map page.

**Step 2: Verify**
- Edit dialog shows remark and saves.
- Card shows remark line, truncates, tooltip shows full.
- Copy remark works.
- Clear list works with confirm.
- Price sorted asc; commission label is “佣金”.


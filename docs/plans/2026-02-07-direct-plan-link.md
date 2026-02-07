# Direct Plans Link Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a required "plan_link" field to direct plans, capture it in add/edit forms, and make the brand text open the link in a new tab when present.

**Architecture:** Extend the `direct_plans` table with a new `plan_link` column (nullable in DB), enforce non-empty validation in API, and wire the field through front-end types/forms. The list stays the same, but the brand text becomes a link when `plan_link` exists.

**Tech Stack:** Supabase (Postgres), FastAPI (backend), React + TypeScript (frontend), Vitest (frontend tests), pytest (backend tests).

### Task 1: Add database column

**Files:**
- Create: `supabase/migrations/2026_02_07_add_direct_plan_link.sql`

**Step 1: Write migration**

```sql
alter table public.direct_plans
  add column if not exists plan_link text;
```

**Step 2: Apply migration**

Run (Supabase MCP): `mcp__supabase__apply_migration` with name `add_direct_plan_link` and SQL above.

**Step 3: Commit**

```bash
git add supabase/migrations/2026_02_07_add_direct_plan_link.sql
git commit -m "feat(db): add plan_link to direct_plans"
```

### Task 2: Backend validation tests (TDD)

**Files:**
- Modify: `backend/tests/test_direct_plans.py`

**Step 1: Write failing tests**

```python
async def test_create_requires_plan_link(self):
    with self.assertRaises(HTTPException) as ctx:
        await direct_plans.create_direct_plan(
            {"platform": "京东", "category": "A", "brand": "B", "plan_link": ""}
        )
    self.assertEqual(ctx.exception.status_code, 400)

async def test_update_rejects_empty_plan_link(self):
    with self.assertRaises(HTTPException) as ctx:
        await direct_plans.update_direct_plan("p1", {"plan_link": ""})
    self.assertEqual(ctx.exception.status_code, 400)
```

**Step 2: Run test to verify it fails**

Run: `python -m pytest backend/tests/test_direct_plans.py -q`
Expected: FAIL (missing validation / field)

**Step 3: Commit**

```bash
git add backend/tests/test_direct_plans.py
git commit -m "test(backend): require plan_link"
```

### Task 3: Backend API support

**Files:**
- Modify: `backend/api/direct_plans.py`

**Step 1: Implement minimal changes**

```python
class DirectPlanCreate(BaseModel):
    plan_link: str

class DirectPlanUpdate(BaseModel):
    plan_link: Optional[str] = None

# validate plan_link in create
plan_link = (payload.plan_link or "").strip()
if not plan_link:
    raise HTTPException(status_code=400, detail="定向计划链接不能为空")

# validate in update when provided
if payload.plan_link is not None:
    value = payload.plan_link.strip()
    if not value:
        raise HTTPException(status_code=400, detail="定向计划链接不能为空")
    updates["plan_link"] = value

# include in insert body and normalize_direct_plan
```

**Step 2: Run tests**

Run: `python -m pytest backend/tests/test_direct_plans.py -q`
Expected: PASS

**Step 3: Commit**

```bash
git add backend/api/direct_plans.py
git commit -m "feat(backend): add plan_link support"
```

### Task 4: Frontend view tests (TDD)

**Files:**
- Modify: `src/components/direct-plans/DirectPlansPageView.test.tsx`

**Step 1: Add failing tests**

```tsx
it("renders brand as link when plan_link exists", () => {
  const plans = [
    { id: "p1", platform: "京东", category: "A", brand: "品牌", plan_link: "https://example.com" },
  ] as DirectPlan[]
  render(<DirectPlansPageView {...baseProps} plans={plans} />)
  const brandLink = screen.getByRole("link", { name: "品牌" })
  expect(brandLink).toBeTruthy()
})

it("renders brand as text when plan_link missing", () => {
  const plans = [
    { id: "p1", platform: "京东", category: "A", brand: "品牌" },
  ] as DirectPlan[]
  render(<DirectPlansPageView {...baseProps} plans={plans} />)
  expect(screen.queryByRole("link", { name: "品牌" })).toBeNull()
  expect(screen.getByText("品牌")).toBeTruthy()
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- DirectPlansPageView.test.tsx`
Expected: FAIL (no link)

**Step 3: Commit**

```bash
git add src/components/direct-plans/DirectPlansPageView.test.tsx
git commit -m "test(frontend): cover plan_link rendering"
```

### Task 5: Frontend implementation

**Files:**
- Modify: `src/components/direct-plans/types.ts`
- Modify: `src/components/direct-plans/DirectPlansPageContent.tsx`
- Modify: `src/components/direct-plans/DirectPlansPageView.tsx`

**Step 1: Types**

```ts
plan_link?: string | null
```

**Step 2: Form field & validation**
- Add `planLink` state, bind to input labeled “定向计划链接”.
- On submit: include `plan_link: planLink.trim()`.
- Validate `planLink.trim()` not empty in `validateForm()`.

**Step 3: Brand link rendering**

```tsx
const hasLink = Boolean(plan.plan_link && plan.plan_link.trim())
return hasLink ? (
  <a
    href={plan.plan_link}
    target="_blank"
    rel="noreferrer noopener"
    className="text-sky-600 hover:underline"
  >
    {plan.brand}
  </a>
) : (
  <span className="text-slate-700">{plan.brand}</span>
)
```

**Step 4: Run tests**

Run: `npm test -- DirectPlansPageView.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/direct-plans/types.ts src/components/direct-plans/DirectPlansPageContent.tsx src/components/direct-plans/DirectPlansPageView.tsx
git commit -m "feat(frontend): add plan_link field and brand link"
```

### Task 6: Full verification

**Step 1: Backend**
Run: `python -m pytest backend/tests/test_direct_plans.py -q`
Expected: PASS

**Step 2: Frontend**
Run: `npm test -- DirectPlansPageView.test.tsx`
Expected: PASS

**Step 3: Commit (optional)**
Only if needed for misc changes.

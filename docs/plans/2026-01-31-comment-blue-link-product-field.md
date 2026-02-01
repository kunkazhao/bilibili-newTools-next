# 评论蓝链商品版字段预留 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 前端为评论蓝链商品版内容预留 `product_content` 字段读取与展示，后端上线后可无缝切换，不影响当前本地缓存。

**Architecture:** 保持当前本地缓存机制，新增优先读取 `combo.product_content`（可选字段）。若字段为空则回退到 localStorage 缓存与现场生成逻辑。

**Tech Stack:** React 19, TypeScript, Vite, Vitest

---

### Task 1: product_content 读取优先级单测

**Files:**
- Modify: `src/components/comment-blue-link/CommentBlueLinkPageContent.tsx`
- Modify: `src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx`

**Step 1: Write the failing test**

```tsx
it("prefers product_content when present", () => {
  const combo = {
    id: "c1",
    name: "组合",
    account_id: "a1",
    category_id: "",
    content: "完整版内容",
    remark: "",
    source_link: "https://b23.tv/abc",
    product_content: "商品版内容",
  }

  render(
    <CommentBlueLinkPageView
      {...baseProps}
      filteredCombos={[combo]}
      visibleCombos={[combo]}
      comboViewStates={{
        c1: {
          mode: "product",
          content: "商品版内容",
          loading: false,
        },
      }}
      onToggleVersion={vi.fn()}
    />
  )

  expect(screen.getByText("商品版内容")).not.toBeNull()
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx`

Expected: FAIL (content not using product_content yet).

**Step 3: Write minimal implementation**

- `CommentBlueLinkPageContent.tsx`:
  - 在 `getComboDisplayContent` 与 `comboViewStates` 生成逻辑中优先读取 `combo.product_content`。
  - 仅当 `product_content` 为空时，才回退到 localStorage 缓存/即时生成。

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/comment-blue-link/CommentBlueLinkPageContent.tsx \
        src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx
git commit -m "feat: prefer product_content when available"
```

---

### Task 2: 回归测试

**Files:**
- Test: `src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx`

**Step 1: Run all tests**

Run: `npm test`

Expected: PASS

**Step 2: Commit (if needed)**

```bash
git add -A
git commit -m "test: verify product_content preference"
```

# 评论蓝链完整版/商品版切换 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在评论蓝链页面新增“完整版/商品版”切换，商品版内容本地缓存（localStorage），切换状态不持久化。

**Architecture:** 前端维护每个组合的视图模式与商品版内容缓存；切换到商品版时按需拉取置顶评论并用 buildProductContent 生成“商品名--短链”列表，结果写入 localStorage。UI 仅展示由内容层计算出的显示内容与加载状态。

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library

---

### Task 1: buildProductContent 单测（lib 层）

**Files:**
- Create: `src/lib/bilibili.test.ts`
- Modify: `src/lib/bilibili.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import { buildProductContent } from "./bilibili"

describe("buildProductContent", () => {
  it("extracts jump_url titles for short links and de-dupes", () => {
    const result = {
      pinnedComments: [
        {
          content: {
            message: "推荐 https://b23.tv/abc 以及 https://b23.tv/def",
            jump_url: {
              "https://b23.tv/abc": { title: "商品A" },
              "https://b23.tv/def": { title: "商品B" },
            },
          },
        },
        {
          content: {
            message: "重复 https://b23.tv/abc",
            jump_url: {
              "https://b23.tv/abc": { title: "商品A" },
            },
          },
        },
      ],
      subReplies: [],
    }

    expect(buildProductContent(result)).toBe(
      "商品A-- https://b23.tv/abc\n商品B-- https://b23.tv/def"
    )
  })

  it("returns fallback when no product lines", () => {
    const result = {
      pinnedComments: [
        { content: { message: "只有短链 https://b23.tv/xyz" } },
      ],
      subReplies: [],
    }

    expect(buildProductContent(result)).toBe("未获取到商品名称")
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/bilibili.test.ts`

Expected: FAIL with “buildProductContent is not a function” or missing export.

**Step 3: Write minimal implementation**

```ts
export const buildProductContent = (result: BilibiliPinnedResult | null) => {
  if (!result) return ""
  const lines: string[] = []
  const seen = new Set<string>()
  const jumpMap = new Map<string, string>()
  const shortPattern =
    /https?:\/\/(?:b23\.tv|bili22\.cn|bili33\.cn|bili2233\.cn)\/[^\s]+/gi

  const collectJump = (comment: Record<string, any>) => {
    const jump = comment?.content?.jump_url || {}
    Object.entries(jump).forEach(([url, info]) => {
      const title = (info as { title?: string; word?: string })?.title ||
        (info as { title?: string; word?: string })?.word ||
        ""
      if (title) {
        jumpMap.set(url, title.trim())
      }
    })
  }

  const pushLine = (name: string, link: string) => {
    const safeName = (name || "").trim()
    const safeLink = (link || "").trim()
    if (!safeName || !safeLink) return
    const key = `${safeName}--${safeLink}`
    if (seen.has(key)) return
    seen.add(key)
    lines.push(`${safeName}-- ${safeLink}`)
  }

  const processComment = (comment: Record<string, any>) => {
    if (!comment?.content?.message) return
    const message = comment.content.message as string
    const matches = message.match(shortPattern) || []
    matches.forEach((link) => {
      const name = jumpMap.get(link) || comment.content?.jump_url?.[link]?.title || ""
      if (name) {
        pushLine(name, link)
      }
    })
  }

  const pinned = Array.isArray(result.pinnedComments) ? result.pinnedComments : []
  pinned.forEach(collectJump)

  const replies = Array.isArray(result.subReplies) ? result.subReplies : []
  replies.forEach((reply) => {
    collectJump(reply)
    if (Array.isArray(reply.replies)) {
      reply.replies.forEach(collectJump)
    }
  })

  pinned.forEach(processComment)
  replies.forEach((reply) => {
    processComment(reply)
    if (Array.isArray(reply.replies)) {
      reply.replies.forEach(processComment)
    }
  })

  const joined = lines.join("\n").trim()
  return joined || "未获取到商品名称"
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/lib/bilibili.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/bilibili.test.ts src/lib/bilibili.ts
git commit -m "test: cover product content builder"
```

---

### Task 2: 评论蓝链卡片切换按钮与展示逻辑

**Files:**
- Modify: `src/components/comment-blue-link/CommentBlueLinkPageView.tsx`
- Modify: `src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx`
- Modify: `src/components/comment-blue-link/CommentBlueLinkPageContent.tsx`

**Step 1: Write the failing test**

```tsx
// in CommentBlueLinkPageView.test.tsx
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

it("renders version toggle and shows product content when mode is product", async () => {
  const user = userEvent.setup()
  const combo = {
    id: "c1",
    name: "组合",
    account_id: "a1",
    category_id: "",
    content: "完整版内容",
    remark: "",
    source_link: "https://b23.tv/abc",
  }

  const onToggleVersion = vi.fn()

  render(
    <CommentBlueLinkPageView
      {...baseProps}
      filteredCombos={[combo]}
      visibleCombos={[combo]}
      comboViewStates={{
        c1: {
          mode: "product",
          content: "商品A-- https://b23.tv/abc",
          loading: false,
        },
      }}
      onToggleVersion={onToggleVersion}
    />
  )

  expect(screen.getByText("商品版")).toBeInTheDocument()
  expect(screen.getByText("商品A-- https://b23.tv/abc")).toBeInTheDocument()

  await user.click(screen.getByText("商品版"))
  expect(onToggleVersion).toHaveBeenCalledTimes(1)
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx`

Expected: FAIL due to missing props / toggle UI.

**Step 3: Write minimal implementation**

- `CommentBlueLinkPageView.tsx`:
  - 增加 `comboViewStates` 与 `onToggleVersion` 两个 props。
  - 卡片头部增加小号按钮显示“完整版/商品版”，点击调用 `onToggleVersion(combo)`。
  - 展示内容改为使用 `comboViewStates[combo.id]?.content`（回退到 `combo.content`），若 `loading` 为 true 显示“商品版生成中...”。

- `CommentBlueLinkPageContent.tsx`:
  - 新增本地状态：`comboViewModes`、`productContents`、`productLoading`。
  - 实现 `ensureProductContent`，读取 localStorage（`comment_combo_product_${comboId}`），无缓存则调用 `getPinnedComments` + `buildProductContent`，写入 state + localStorage。
  - `handleCopyCombo` 按当前模式复制（商品版未生成则提示“商品版生成中，请稍后再试”，并触发生成）。
  - 生成 `comboViewStates`（mode/content/loading）并传给 `CommentBlueLinkPageView`。

**Step 4: Run test to verify it passes**

Run: `npm test -- src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/comment-blue-link/CommentBlueLinkPageView.tsx \
        src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx \
        src/components/comment-blue-link/CommentBlueLinkPageContent.tsx
git commit -m "feat: add full/product toggle for comment combos"
```

---

### Task 3: 回归运行核心测试集

**Files:**
- Test: `src/lib/bilibili.test.ts`
- Test: `src/components/comment-blue-link/CommentBlueLinkPageView.test.tsx`

**Step 1: Run all tests**

Run: `npm test`

Expected: PASS

**Step 2: Commit (if needed)**

```bash
git add -A
git commit -m "test: verify comment blue-link toggle"
```

---

**Notes:**
- 商品版内容仅本地缓存，不写入后端。
- 切换状态不持久化。
- 文案：商品版加载中显示“商品版生成中...”，无结果显示“未获取到商品名称”。

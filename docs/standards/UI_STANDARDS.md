# UI Standards (Component-First)

This document defines the UI rules for the new stack.

## Architecture Rules (Non-Negotiable)
- Pages only handle data + logic.
- Pages MUST NOT contain className / style / CSS.
- All visual styles live inside Components.

## Design Tokens
- Brand color: #2563EB
- Neutrals: slate-50 to slate-900
- Background: slate-50
- Surface: white
- Border: slate-200
- Text: slate-900 / slate-700 / slate-500
- Radius: 8px (inputs), 12px (cards), 16px (modals)
- Shadow: soft card shadow (see tailwind.config.js `boxShadow.card`)
- Typography: "Manrope", "Segoe UI", sans-serif

## Core Components (MVP)
- AppLayout: fixed sidebar + topbar, no props for layout styles.
- PrimaryButton: default blue, no variant exposed.
- InputGroup: label + input + error message.
- Select (Shadcn): use ui/select components directly.
- Slider (Shadcn): use ui/slider for range inputs.
- ProductCard: title + price + image.
- ActionModal: confirm dialog with fixed header/footer.
- ModalForm: form dialog with fixed footer and submit.
- Table: standard header/body style with empty state.
- Skeleton: loading placeholder.
- Toast: global ephemeral notifications.
- Tabs: segmented tabs with internal layout.
- Pagination: simple page controls.
- Badge: status tag.
- Tooltip: hover helper text.
- Empty: empty-state layout.

## Usage Constraints
- Use only the provided components inside Pages.
- Avoid custom classes in Pages.
- If a new UI pattern is needed, create/extend a Component.
- Components can use Tailwind utilities internally.
- InputGroup width uses enum only: sm|md|lg|xl (no arbitrary px). Defaults to md.

## Lint Enforcement
- Pages in `src/pages/**` are blocked from using `className`, `style`, or `tw`.
- Pages in `src/pages/**` cannot import from `@/components/ui` or `@/lib`.
- Run `npm run lint` before commit.

## Feature Reliability Rules (Must Follow)
- Image templates must avoid title clipping: no `overflow: hidden` + tight `line-height` + negative translate on titles.
- Prefer padding to create text “safe area”; line-height for Chinese titles should be >= 1.2.
- Image naming must use merged items (with source data); fallback order: `title` → `uid` → `id` → `商品_序号`.
- Export JSON must follow统一字段与格式（价格加“元”、京东链接需域名校验）。
- See `docs/standards/FRONTEND_ISSUES_AND_RULES.md` for details and checklist.

## Expansion Plan
- Add: Tabs, Pagination, Badge, Tag, Tooltip, EmptyState, Confirm.
- Add: Data table variants (dense, list, grid).
- Add: Form sections (inline, stacked, multi-column).

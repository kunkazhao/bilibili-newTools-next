# Scheme Detail Blue Link UI Adjustments (Design)

Date: 2026-01-31

## Context
The scheme detail sidebar needs UI adjustments for the Blue Link panel and overall sidebar card density. The user confirmed these changes and selected single-account selection (Option B).

## Goals
- Replace account list checkboxes with a single-select dropdown.
- Use icon-only delete buttons in price range rows.
- Align the three Blue Link action buttons on one row; copy action becomes an icon button placed third.
- Reduce the visual height of the right-side cards.

## Non-Goals
- No changes to Blue Link generation logic besides single-account selection handling.
- No new search or filtering for accounts.

## UI Changes
1. **Account selection**
   - Replace checkbox list with a Shadcn `Select` (single select).
   - Placeholder: "选择账号" when none selected.
   - When accounts list is empty, show "暂无账号".

2. **Price range delete**
   - Replace the text "删除" button with an icon-only delete button.
   - Reuse existing delete icon style (Trash icon) with `aria-label="删除"`.

3. **Action buttons layout**
   - One row, left-to-right: `新增区间` (outline), `生成蓝链` (primary), `复制` (icon-only) placed third.
   - Copy button still calls `onCopyAll`.

4. **Card height reduction**
   - Reduce vertical padding and gaps (e.g., `p-5 -> p-4`, `space-y-3 -> space-y-2`).
   - Decrease textarea rows where appropriate (e.g., 4 -> 3, 5 -> 4) to shorten card height.

## State & Data Flow Changes
- Replace `selectedAccountIds: Set<string>` with `selectedAccountId: string`.
- Local storage should persist a single account id (string).
- Default selection: first account in the list when no cached id.
- Generation uses only the selected account.

## Error Handling
- If no account selected, show "请先选择输出账号" (existing path reused).
- If no accounts, show "暂无账号可用于蓝链生成" (existing behavior).

## Tests
- Unit test to verify single-select account dropdown renders and uses correct label.
- Unit test to verify delete icon button triggers `onRemoveRange`.
- Unit test to verify three-button row includes icon-only copy action and calls `onCopyAll`.

## Impacted Files
- `src/components/schemes/SchemeDetailSidebar.tsx`
- `src/components/schemes/SchemeDetailPageContent.tsx`
- `src/components/schemes/SchemeDetailSidebar.test.tsx` (if exists) or new test file


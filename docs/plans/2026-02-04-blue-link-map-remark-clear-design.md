# Blue Link Map Remark + Clear List Design (2026-02-04)

## Summary
Add a per-entry remark field to blue-link mapping so users can save, display, copy, and hover-preview remarks. Add a "clear list" action to remove all entries in the current account + category. Update list layout (title/ops alignment) and pricing line wording (commission label).

## Goals
- Persist a remark per blue-link mapping entry (DB + API + UI).
- Show remark line in cards with truncation + hover tooltip + copy action.
- Add "Clear list" button with confirm dialog (clears current account + category).
- Default list sorting by price ascending; missing price goes last.
- Price and commission on one line; commission label becomes "佣金".

## Non-Goals
- No changes to sourcing/product master data.
- No changes to blue-link mapping business logic besides remark + clear list.
- No change to export or other modules outside blue-link mapping.

## Data Model Changes
Table: `blue_link_map_entries`
- Add column: `remark text null`

Notes:
- Remark belongs to mapping entry, not product.
- No requirement for uniqueness or indexing.

## API Changes (backend)
- `GET /api/blue-link-map/state-v2`: include `remark` in entry payload.
- `POST /api/blue-link-map/entries/batch`: accept optional `remark` for each entry.
- `PATCH /api/blue-link-map/entries/{id}`: allow updating `remark`.
- `POST /api/blue-link-map/entries/clear`: delete entries by `{ account_id, category_id }`.

## Frontend Changes (React)
- Edit dialog: add a remark input.
- Card display: add a remark line at bottom.
  - Truncate at 20 chars, show full on hover via Tooltip.
  - Copy remark via a button; reuse copy feedback style.
- Toolbar: add "清空列表" to the left of "导入蓝链".
  - Confirm dialog before calling clear endpoint.
- Layout:
  - Title aligned with right-side action buttons.
  - Price + commission on one line.
  - Commission label text: "佣金".
- Sorting:
  - Default ascending by price (fallback to entry price; missing → Infinity).

## Error Handling
- Empty remark: show "暂无备注" when copying.
- Clear list: show error if no account or category.
- API errors show toast/alert message.

## Testing
- Update API tests to include `remark` field in payload/normalize paths.
- Update page tests for new UI strings (佣金) and remark/clear list UI.

## Rollout
- Apply DB migration to add `remark`.
- Deploy backend changes.
- Deploy frontend changes.


# Comment Blue Link: Remove Categories (Design)

## Goal
Remove all category UI/logic from the comment blue link management page. Creating/editing combos should no longer require `category_id`.

## Scope
- Frontend: remove category field/state, remove category payload, ignore categories in state.
- Backend: make `CommentComboCreate.category_id` optional and omit it when missing.

## Non-Goals
- Remove category tables/endpoints (kept for now).
- Change category behavior in other pages.

## Data Flow
- UI sends payload `{ account_id, name, source_link, content, remark }`.
- Backend accepts missing `category_id` and writes null/omits the field.

## Tests
- Frontend: `src/components/comment-blue-link/CommentBlueLinkPageContent.test.tsx`
- Frontend: `src/components/comment-blue-link/CommentBlueLinkDialogs.test.tsx`
- Backend: `backend/tests/test_comment_blue_link_payloads.py`

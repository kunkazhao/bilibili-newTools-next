# Schemes List Card Interaction Design

## Goal
Adjust the schemes list UI so that:
- The "enter scheme" action is triggered by clicking the whole card.
- The create button moves to the list header area (right aligned).
- Edit/delete actions use a unified icon-only style.
- Category label is removed from the scheme card summary.

## Current State
- A top-right "Create scheme" button exists above the page grid.
- Each scheme card shows a "Category: ..." line and has three buttons: Edit, Delete, Enter.

## Decisions
- Adopt option A: move the create button into the list area header (right aligned above cards).
- Make cards clickable and provide hover affordances to indicate navigation.

## UI Changes
- Remove the "Enter scheme" button from the card action row.
- Convert Edit/Delete buttons to ghost icon buttons (Pencil / Trash2).
- Add `cursor-pointer` and hover styles (border/shadow) to cards.
- Remove the "Category: ..." line from the card info block.
- Update empty-state copy to point to the new create button location (e.g., "Click the create button on the right").

## Interaction Rules
- Clicking the card triggers `onEnterScheme(scheme.id)`.
- Clicking edit/delete icons should not trigger card navigation (use `stopPropagation`).

## Testing
Add a new `SchemesPageView.test.tsx` to cover:
- Card click triggers `onEnterScheme`.
- Edit/Delete icon clicks trigger their callbacks and do not call `onEnterScheme`.
- "Create scheme" button is in list header (and not in the top-right page header).
- Category line is not rendered in the card summary.


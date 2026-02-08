# Category Hierarchy Accordion Design

## Goal
Introduce a shared category hierarchy sidebar for Archive (sourcing) and Schemes pages using a single-open, collapsible accordion for level-1 categories with level-2 categories inside.

## Context
Both Archive and Schemes currently render level-1/level-2 category lists inline in their page views. The UI needs a single-open accordion (with optional all-collapsed state) and should be implemented once and reused.

## Proposed Component
Create `src/components/archive/CategoryHierarchy.tsx` and move the sidebar category rendering into it.

**Responsibilities:**
- Render level-1 categories as an accordion (Radix via shadcn Accordion).
- Render level-2 category list within the expanded parent.
- Keep selection state in the parent page (props in, callbacks out).
- Support skeleton/loading state.
- Support optional child count display (enabled on Archive, disabled on Schemes).

## Behavior
- Accordion type: `single` with `collapsible` enabled.
- When a parent is expanded, call `onParentSelect(parentId)`.
- When a parent is expanded and no child is selected, default to the first child.
- When all parents are collapsed, keep the current `activeCategoryId` untouched; only hide the child list.

## Integration
- Replace the duplicated category UI in:
  - `src/components/archive/ArchivePageView.tsx`
  - `src/components/schemes/SchemesPageView.tsx`
- Add shadcn `Accordion` component under `src/components/ui/accordion.tsx` if not present.

## Tests
Add a new unit test for the shared component to validate:
- Only one parent open at a time.
- Collapsible allows all parents closed.
- Parent click triggers `onParentSelect`.
- Child click triggers `onCategorySelect`.
- Child count visibility respects `showChildCount`.

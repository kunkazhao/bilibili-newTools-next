# Scheme Detail Export Zip Naming Design

## Goal
When exporting scheme detail product card images, name the zip file as `scheme-name-category.zip` (scheme name + category name).

## Context
`SchemeDetailPageContent` generates product card images with `JSZip` and triggers download via an `<a>` element. The current filename is a hardcoded prefix plus timestamp, which does not reflect the scheme or category.

## Decision
Use option 1 (minimal change): update the download name directly in the `generateImages` flow.

## Design
- Build base name from `scheme.name` and `scheme.category_name`.
- Sanitize with existing `sanitizeFilename` to remove invalid characters and cap length.
- Fallbacks:
  - `scheme.name` missing -> `Scheme`
  - `scheme.category_name` missing -> `scheme.category_id` (if present) -> `Category`
- Final filename: `${sanitizeFilename(`${schemeName}-${categoryName}`)}.zip`

## Data Flow
- `scheme` is already loaded from `/api/schemes/{schemeId}` and stored in state.
- `generateImages` uses `scheme` when constructing the zip filename; no extra API calls.

## Error Handling
- No change to existing error paths for image generation or zip creation.
- Filename construction is pure and cannot fail except for missing data, which is handled by fallbacks.

## Testing
- Add a Vitest test in `src/components/schemes/SchemeDetailPageContent.test.tsx`.
- Render `SchemeDetailPageContent`, trigger `sidebar.image.onGenerate` via a mocked `SchemeDetailPageView`.
- Stub `html2canvas`, `JSZip`, `URL.createObjectURL`, and `getBoundingClientRect`.
- Assert the generated anchor `download` equals `scheme-name-category.zip`.

## Out of Scope
- Renaming zip files for other exports (Excel/JSON).
- Changing image content or template rendering.

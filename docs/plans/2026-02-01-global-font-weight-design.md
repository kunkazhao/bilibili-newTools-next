# Global Font Weight Baseline (Design)

Date: 2026-02-01

## Context
The user wants the entire app to feel slightly bolder by default, with a consistent base font weight across text and form controls.

## Goals
- Apply a consistent default font weight across body text and common form controls.
- Preserve existing font families, sizes, colors, and component-level emphasis.
- Keep the change small and easy to override locally.

## Non-Goals
- No changes to font sizes, line heights, or typography scale.
- No font source updates (e.g., Google Fonts weights) beyond what is already loaded.
- No refactor of per-component `font-` utility usage.

## Approach
- Add a `@layer base` rule in `src/index.css` for `body, button, input, select, textarea` using Tailwind `font-medium` (500).
- Keep the existing `body` rule for font-family, background, and color.
- Allow component-specific utilities like `font-semibold` to continue overriding the base weight.

## Tests
- Extend `src/index.css.test.ts` to assert the presence of the default font-weight rule for base typography.

## Impacted Files
- `src/index.css`
- `src/index.css.test.ts`

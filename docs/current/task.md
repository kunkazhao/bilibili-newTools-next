# Task List

## P0 - Fix build errors first

- [ ] Fix `npm run build` TypeScript errors (root cause: `tsconfig.json` only includes `vite/client` types, tests under `src` pull in `node:fs/path` + `process`, and strict rules surface existing type issues). Suggested fix path:
  - Add a build-only tsconfig to exclude `src/**/*.test.ts(x)` and `src/__tests__/**`, then change build to `tsc -p tsconfig.build.json && vite build`.
  - Or install `@types/node` and include `"node"` in `types`, then clean up remaining strict errors.
- [ ] 选品库页面：新增按钮点击无响应（按图复现，需先修 bug 再继续后端拆分）。

## P1 - Backend refactor (after build is green)

- [ ] Split backend routes into modules by API group (sourcing / schemes / comment / commission / zhihu / bilibili / video / benchmark / blue-link-map), keep `backend/main.py` as app init + router include only.


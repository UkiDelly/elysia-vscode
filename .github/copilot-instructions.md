# Copilot Instructions for elysia-vscode 🔧

Purpose: quick, actionable rules for AI coding agents to be productive in this VS Code extension repo.

## Quick Dev / Debug Commands ✅

- Build (single): `pnpm run compile` (runs `webpack`)
- Watch (dev): `pnpm run watch` (use this for fast edit-compile loop)
- Run tests: `pnpm run test` (note: `pretest` runs compile + lint)
- Lint: `pnpm run lint`
- Package for publish: `pnpm run vscode:prepublish` / `pnpm run package`
- Debug extension: run `Watch`, then press **F5** to open Extension Development Host and use the `Elysia Routes` view.
- Logs: Output channel `Elysia Visualizer` (see `src/logger.ts`).

## Big Picture — what the code does 🧭

- Purpose: statically parse TypeScript ElysiaJS projects to show route trees in a VS Code TreeView.
- Entry: `src/extension.ts` — registers `RouteTreeProvider` and handles activation rules.
- Data flow: save/activation → `RouteTreeProvider.refresh()` → scan `**/*.{ts,tsx}` → `parser.parseRoutes()` → build effective routes (prefix propagation) → populate `elysia-routes-view` TreeView.
- Packaging: extension main is `./dist/extension.js` (built with `webpack`).

## Important project-specific patterns (must-follow) 🧩

- Static, AST-based parsing only. Dynamic runtime routes are not detectable.
- HTTP methods are detected using `HTTP_METHODS = ['get','post','put','delete','patch','head','options']` and only treated as routes if the call has >= 2 arguments (prevents false positives like `headers.get('x')`). See `src/parser.ts`.
- Prefix handling:
  - `group('/prefix', () => { ... })` accumulates prefix when traversing callback body.
  - `new Elysia({ prefix: '/x' })` is recognized via `getElysiaInstancePrefix()` and factored into route paths.
  - `.use(moduleVar)` is detected as a usage with an attached prefix and used during bottom-up prefix propagation in `src/route-provider.ts`.
- Parent/ownership detection: route `parentVar` is set by walking AST ancestors until a `VariableDeclaration` is found; exported variables are tracked for cross-file propagation.
- Final route path calculation and deduplication are done in `RouteTreeProvider` (look for `resolvePrefixes` and dedupe by method+path).

## Performance & caching ⚡

- Files are cached in `_parsedCache` keyed by filesystem `mtime`. Modify `route-provider` if adding more aggressive invalidation.
- Workspace scanning excludes `node_modules` and uses `findFiles('**/*.{ts,tsx}', '**/node_modules/**')`.

## How to extend parser safely 🔧

- New method patterns (e.g., custom verb or decorator-based route) must be added in `src/parser.ts` and have unit coverage. Update:
  - `HTTP_METHODS` if adding HTTP verbs
  - `visit()` logic to detect the call shape
  - Add edge-case tests in `src/logic_test.ts` style (the repo keeps logic examples there).
- Be explicit: prefer AST patterns (identifiers, string literals) over heuristics. Document any relaxed heuristics in this file.

## Debugging tips 🐞

- Use `logger.log(...)` and `logger.error(...)` to emit into `Elysia Visualizer` output for quick feedback.
- For prefix/propagation bugs, add small `ParsedData` fixtures to `src/logic_test.ts` and run node-based assertions.
- If TreeView shows nothing, check `setContext('elysia:isElysiaProject', ...)` in `src/extension.ts` — project detection reads all `package.json` files looking for `elysia` in dependencies.

## Tests & CI notes ✅

- `pretest` runs `compile` + `lint` to ensure build and code quality before tests.
- Tests expect compiled outputs (build before running tests). Keep test fixtures small and deterministic.

## Files to reference when making changes 🗂️

- `src/extension.ts` — activation, commands, and project detection
- `src/parser.ts` — AST parsing logic and route detection
- `src/route-provider.ts` — prefix propagation, caching, and TreeView assembly
- `src/logger.ts` — output logging helper
- `src/logic_test.ts` — helpful mock/test logic demonstrating prefix application
- `README.md` / `CLAUDE.md` — human-facing docs and background

---

If anything in these notes is unclear or you need more examples (e.g., a failing test case for prefix propagation), say which area to expand and I will iterate. ✅

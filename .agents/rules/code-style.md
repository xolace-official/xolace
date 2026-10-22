# Code style (Ultracite / Biome)

The repo uses **Ultracite**, a zero-config Biome preset, from one root `biome.json`.
Biome formats and lints; most issues auto-fix.

- Fix: `bun run fix` (`ultracite fix`) · Check: `bun run check` · Diagnose: `bunx ultracite doctor`
- The husky pre-commit hook runs `ultracite fix` on staged files. Don't bypass it.
- Changed files only while iterating: `bun run check:changed` (runs Biome on them for you).

Write code that is **accessible, performant, type-safe and maintainable**. Prefer clarity
and explicit intent over brevity.

## Type safety

- Explicit types on parameters and return values when they help a reader.
- `unknown` over `any`. Narrow instead of asserting.
- `as const` for immutable values and literal types.
- Named constants instead of magic numbers.

## Modern TS/JS

- Arrow functions for callbacks and short functions.
- `for...of` over `.forEach()` and indexed `for`.
- `?.` and `??` for safe access; template literals over concatenation; destructuring.
- `const` by default, `let` only when reassigned, never `var`.

## Async

- Always `await` promises in async functions and use the result.
- `async/await` over promise chains. `try/catch` where you can actually handle the error.
- Never use an async function as a Promise executor.

## React and JSX

- Function components only. Hooks at the top level, never conditionally.
- Correct, complete dependency arrays.
- `key` on iterated elements: stable IDs, not array indices.
- Children between tags, not as a prop. Never define components inside components.
- React 19+: `ref` as a prop, not `forwardRef`.
- **React Compiler is on** (web, admin, mobile). Don't add `useMemo`, `useCallback` or
  `memo()` for performance. Keep manual memoization only for:
  - a Context Provider `value` object;
  - functions in `useEffect` dependency arrays (removing them loops the effect);
  - a `useSyncExternalStore` `subscribe` function;
  - bodies containing `try/finally` (the compiler skips them);
  - `memo()` on a component that opts out with `"use no memo"`.
- Accessibility: meaningful `alt`, proper heading order, labels on inputs, keyboard
  handlers alongside mouse handlers, semantic elements (`<button>`, `<nav>`) over
  `div` + role.

## Errors and debugging

- No `console.log`, `debugger` or `alert` in shipped code.
- Throw `Error` objects with descriptive messages.
- Don't catch just to rethrow. Prefer early returns for error cases.

## Organization

- Small focused functions; extract complex conditions into named booleans.
- Early returns over nesting; no nested ternaries.
- **Colocate by feature.** New code goes in a folder named for its feature, on both
  backend (`convex/<feature>/`) and client (`src/features/<feature>/`), with its tests
  beside it. Don't add files to horizontal dirs (`hooks/`, `services/`, `types/`,
  `helpers/`, `interfaces/`); exceptions are design-system primitives, cross-cutting
  infra (`providers/`, `store/`, `lib/`) and themes.
- No barrel files (index re-exports). Specific imports over namespace imports.

## Security and performance

- `rel="noopener"` with `target="_blank"`. Avoid `dangerouslySetInnerHTML`, `eval()`,
  direct `document.cookie` writes. Validate and sanitize user input.
- No spread in loop accumulators. Regex literals at module top level.
- Next.js: `<Image>` not `<img>`; metadata API not `<head>`; data fetching in Server
  Components, not async Client Components.

## Tests

- Assertions inside `it()`/`test()`. async/await, no done callbacks.
- No committed `.only` / `.skip`. Keep `describe` nesting shallow.

## Where Biome can't help

Business-logic correctness, naming, architecture, edge cases, UX and accessibility
behaviour, and comments that explain *why* — those are on you.

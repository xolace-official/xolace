# Lint debt from the xolace_app move

Code moved in from `xolace_app` (Phase 2) predates Ultracite. These Biome rules
are turned **off** for the legacy paths so the pre-commit hook passes; formatting
is handled separately (Commit D). Each later PR that fixes a rule removes it from
the override and from this list.

Counts are the errors left after `ultracite fix` (safe fixes applied) across the
whole path, measured at Commit C.

## `apps/mobile` (1422 errors, 47 rules)

Override: `apps/mobile/biome.json`, paths `src/**`, `vitest.setup.ts`,
`metro.config.js`. The root override list does not reach files under a nested
config, so mobile's lives in its own `biome.json`.

| Rule | Count |
|---|---:|
| `style/useConsistentTypeDefinitions` | 322 |
| `suspicious/noLeakedRender` | 121 |
| `style/noNestedTernary` | 107 |
| `style/noNonNullAssertion` | 95 |
| `suspicious/noUnnecessaryConditions` | 94 |
| `correctness/useExhaustiveDependencies` | 87 |
| `correctness/noUnusedVariables` | 60 |
| `style/noIncrementDecrement` | 51 |
| `style/useTemplate` | 49 |
| `complexity/noVoid` | 47 |
| `suspicious/noEmptyBlockStatements` | 42 |
| `performance/useTopLevelRegex` | 31 |
| `suspicious/noExplicitAny` | 31 |
| `suspicious/noArrayIndexKey` | 30 |
| `performance/noNamespaceImport` | 29 |
| `suspicious/noEqualsToNull` | 28 |
| `complexity/noForEach` | 26 |
| `complexity/noExcessiveCognitiveComplexity` | 23 |
| `suspicious/noShadow` | 16 |
| `style/noExportedImports` | 15 |
| `style/useDestructuring` | 14 |
| `style/useFilenamingConvention` | 13 |
| `suspicious/noBitwiseOperators` | 12 |
| `correctness/noUnusedFunctionParameters` | 8 |
| `style/useDefaultSwitchClause` | 8 |
| `suspicious/useIterableCallbackReturn` | 8 |
| `performance/noBarrelFile` | 7 |
| `suspicious/noUnusedExpressions` | 7 |
| `complexity/noUselessLoneBlockStatements` | 5 |
| `performance/noAwaitInLoops` | 5 |
| `correctness/noUnusedImports` | 3 |
| `style/useAtIndex` | 3 |
| `suspicious/noEvolvingTypes` | 3 |
| `suspicious/noNestedPromises` | 3 |
| `style/useConsistentMethodSignatures` | 2 |
| `suspicious/noImplicitAnyLet` | 2 |
| `suspicious/noRedeclare` | 2 |
| `suspicious/noReturnAssign` | 2 |
| `suspicious/noShadowRestrictedNames` | 2 |
| `suspicious/useAwait` | 2 |
| `complexity/useOptionalChain` | 1 |
| `correctness/noVoidTypeReturn` | 1 |
| `style/useNodejsImportProtocol` | 1 |
| `style/useShorthandAssign` | 1 |
| `suspicious/noAssignInExpressions` | 1 |
| `suspicious/noConfusingVoidType` | 1 |
| `suspicious/noGlobalAssign` | 1 |

`__DEV__` is declared as a global in `apps/mobile/biome.json` rather than
counted as debt.

## `packages/backend` (882 errors, 37 rules)

Override: root `biome.json`, paths `packages/backend/convex/**`,
`packages/backend/scripts/**`.

| Rule | Count |
|---|---:|
| `performance/noAwaitInLoops` | 222 |
| `style/noNonNullAssertion` | 138 |
| `performance/useTopLevelRegex` | 91 |
| `style/useConsistentTypeDefinitions` | 90 |
| `style/noIncrementDecrement` | 57 |
| `suspicious/useAwait` | 39 |
| `style/useDestructuring` | 34 |
| `suspicious/noEmptyBlockStatements` | 28 |
| `complexity/noExcessiveCognitiveComplexity` | 27 |
| `style/noNestedTernary` | 27 |
| `suspicious/noEvolvingTypes` | 17 |
| `complexity/useOptionalChain` | 16 |
| `suspicious/noShadow` | 13 |
| `style/useTemplate` | 11 |
| `style/useAtIndex` | 9 |
| `suspicious/noBitwiseOperators` | 7 |
| `suspicious/noEqualsToNull` | 7 |
| `suspicious/noUnnecessaryConditions` | 6 |
| `complexity/useLiteralKeys` | 5 |
| `suspicious/noAssignInExpressions` | 5 |
| `style/useDefaultSwitchClause` | 4 |
| `suspicious/noExplicitAny` | 4 |
| `suspicious/noImplicitAnyLet` | 3 |
| `suspicious/noReturnAssign` | 3 |
| `complexity/noVoid` | 2 |
| `correctness/noUnsafeOptionalChaining` | 2 |
| `correctness/noUnusedFunctionParameters` | 2 |
| `correctness/noUnusedVariables` | 2 |
| `style/useCollapsedIf` | 2 |
| `style/useErrorCause` | 2 |
| `complexity/noCommaOperator` | 1 |
| `complexity/noUselessSwitchCase` | 1 |
| `correctness/noUnusedInstantiation` | 1 |
| `style/noExportedImports` | 1 |
| `style/noParameterAssign` | 1 |
| `style/useConsistentBuiltinInstantiation` | 1 |
| `suspicious/useStaticResponseMethods` | 1 |

ESLint (`@convex-dev/eslint-plugin` v5, new rules vs the app's v4), downgraded to
`warn` in `packages/backend/eslint.config.js`:

| Rule | Count |
|---|---:|
| `@convex-dev/no-duplicate-indexes` | 3 (`schema.ts`; dropping an index is a schema change) |
| `@convex-dev/explicit-table-ids` | 1 |

`@convex-dev/no-top-of-hour-crons` reports 3 warnings and is left as is.

## Hazard for Commit D

`ultracite fix` corrupts JSX in five files under
`apps/mobile/src/features/insights/` (`glass.tsx`, `detail-card.tsx`,
`domain-list.tsx`, `trend-chip.tsx`, `overall-dial.tsx`): with several props per
line, the attribute sort merges the tag name into the first prop
(`<Tick key=... fill=...` becomes `<Tickfill=...`), leaving unparseable code.
Reformat those by hand, or turn `assist/source/useSortedAttributes` off for them,
and check `tsc` before committing D.

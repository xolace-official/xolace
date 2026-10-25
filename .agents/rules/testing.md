# Testing

## Tiers

| Tier | Command | Covers | Runs |
|---|---|---|---|
| Changed only | `bun run check:changed` | Biome on changed files; `check-types` + `lint` for affected packages and their dependents; tests sitting next to changed files | locally, while iterating |
| Unit + Convex | `bun run test` (`turbo run test --affected` in CI) | convex-test (edge-runtime), pure TS logic, RN logic with mocks, the security suite. Offline | every PR |
| Local Convex integration | `bun run test:local` | a local backend; refuses to run against cloud deployments | local, nightly |
| Web / admin E2E | `bun run test:e2e -F @xolace/web` · `-F @xolace/admin` | Playwright + `@clerk/testing` against the E2E deployment, reset and seeded first | PRs touching web, admin or backend |
| Mobile E2E (blocking) | `.argent/flows` | the E2E simulator build | PRs touching mobile or backend (EAS Workflow) |
| Mobile E2E (exploratory) | argent agent run from the PR title/body/diff | same build; reports, never blocks | same PRs |
| Live evals | `test:evals:*` | model behavior (intensity, talk) | PRs touching `convex/ai/**` |

Tiers beyond "Changed only" and "Unit" land with Phase 1E/2/3; until a command
exists, say in the PR that the tier was not run.

## How `check:changed` decides

- Base: merge-base of `HEAD` with `main` (`--base <ref>` to override). Files =
  committed since base + staged + unstaged + untracked.
- Inert (no typecheck, no tests): `*.md`, `.agents/**`, root `docs/**`.
- A root config change (`package.json`, `bun.lock`, `turbo.json`, `tsconfig.json`,
  `bunfig.toml`) widens to every package, as CI does.
- Tests: `foo.ts` → `foo.test.ts` / `foo.spec.tsx` / ... beside it, plus changed test
  files. Packages with `vitest` run `vitest run <files>`; root `scripts/` use
  `bun test`.
- `--list` prints the plan without running it.

## Writing tests

- Bug fix: write the test that fails first, then fix. That test is the proof.
- Before writing a component in isolation, list the ways it can fail; test those.
- Test behavior through public interfaces, not internals. No `.only`/`.skip` committed.
- Convex: `convex-test` with `t.withIdentity(...)` for auth paths; never hit a cloud
  deployment from unit tests.
- Mobile E2E: prefer adding a `testID` over vision-only assertions. Test sign-in uses
  the passwordless `e2e-sign-in` button (E2E builds with a `pk_test_` key only); no
  passwords in bundles, no shared test accounts.

## Proof in PRs

Pick the evidence before reproducing: visual → before/after screenshots; timing or
animation → recording; logic → failing-then-passing test. State what the simulator
can't prove (microphone/voice, purchases, push, native auth sheets).

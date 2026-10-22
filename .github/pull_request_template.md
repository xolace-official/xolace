<!--
PR title must be a Conventional Commit: type(scope): subject
e.g. fix(mobile): keep the mirror visible after the keyboard closes
One problem per PR. See CONTRIBUTING.md.
-->

## Problem

<!-- What is wrong or missing, and who it affects. Link the issue if there is one. -->

## Change

<!-- What this PR does about it, and anything a reviewer should look at first. -->

## Surfaces touched

<!-- Tick every surface this change can affect, even indirectly. -->

- [ ] Mobile (`apps/mobile`)
- [ ] Web (`apps/web`)
- [ ] Admin (`apps/admin`)
- [ ] Desktop (`apps/desktop`)
- [ ] CLI (`apps/cli`)
- [ ] Backend contract (`packages/backend`: schema, function args or return shapes; must stay compatible with shipped mobile builds)
- [ ] Docs (`apps/docs`, READMEs, AGENTS.md)

## Verification

<!--
Pick the evidence that fits the change:
- Visual change: before/after screenshots
- Timing or animation: a screen recording
- Logic: a test that failed before this change and passes now (name it)
-->

- [ ] Evidence attached (screenshots / recording / failing-then-passing test):
- Commands run (e.g. `bun run check:changed`, `bun run test`):

**Could not verify:**
<!-- What the simulator or local setup can't prove, e.g. microphone and voice, purchases, push, native auth sheets, production-only Clerk behaviour. Write "nothing" if everything was covered. -->

## Model & harness

<!-- Only if an agent wrote some or all of this PR. Delete otherwise. -->

- Model:
- Harness / tool (e.g. Claude Code, Codex, Cursor):
- How much was agent-written, and what a human reviewed:

<!--
PR title must be a Conventional Commit: type(scope): subject
e.g. fix(mobile): keep the mirror visible after the keyboard closes
One problem per PR. See CONTRIBUTING.md. Agents: .agents/rules/pull-requests.md.
-->

## Problem

<!-- What is wrong or missing, and who it affects. Link the issue if there is one. -->

## Change

<!--
Lead with the smallest picture that shows the change, then a few bullets.
Pick one (rarely two): a diff-sketch of a call tree, component tree or file tree;
pseudocode for logic; a Mermaid diagram for flow between client, Convex and services.

```diff
 <SessionPage>
   <SessionToolbar>
+    <RunSkillButton />
```

Then: what a reviewer should look at first.
-->

## Surfaces touched

<!-- Tick every surface this change can affect, even indirectly. -->

- [ ] Mobile (`apps/mobile`)
- [ ] Web (`apps/web`)
- [ ] Admin (`apps/admin`)
- [ ] Desktop (`apps/desktop`)
- [ ] CLI (`apps/cli`)
- [ ] Backend contract (`packages/backend`: schema, function args or return shapes; must stay compatible with shipped mobile builds)
- [ ] Docs (`apps/docs`, READMEs, AGENTS.md)

## Merge danger

<!--
Door: two-way (a revert undoes it) or one-way (a revert doesn't).
One-way here: a Convex contract change shipped mobile builds will call, a schema
change or data migration on prod, a native change that needs a store build,
deleting user data, anything sent to users (push, email, OTA).
Blast radius: one word, then what breaks if this is wrong.
-->

**Door:** two-way

**Blast radius:**

## Verification

<!--
Show a before and after, matched to the change:
- Visual change: before/after screenshots
- Timing or animation: a screen recording
- Logic: a test that failed before this change and passes now (name it)
-->

- **Before:**
- **After:**
- Commands run (e.g. `bun run check:changed`, `bun run test`):

**Could not verify:**
<!-- What the simulator or local setup can't prove, e.g. microphone and voice, purchases, push, native auth sheets, production-only Clerk behaviour. Write "nothing" if everything was covered. -->

## Model & harness

<!-- Only if an agent wrote some or all of this PR. Delete otherwise. -->

- Model:
- Harness / tool (e.g. Claude Code, Codex, Cursor):
- How much was agent-written, and what a human reviewed:

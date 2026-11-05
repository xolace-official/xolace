# Pull requests

Read when opening or editing a PR. The body follows
`.github/pull_request_template.md`; this file says how to fill it. Short prose, no
preamble, and the terms from the Glossary in the root `AGENTS.md`.

The `pr` skill (mattpocock-skills) is welcome for its style, but this template wins:
keep every section below, in this order.

## Problem

What is wrong or missing and who it hits. Link the issue (`Closes #n`). Name who
flagged it if it came from a review.

## Change

Lead with the smallest view that makes the point, placed next to the sentence it
supports. Usually one, never all:

| Change is about | Show |
|---|---|
| UI structure | component tree, as a `diff` when the tree already exists |
| runtime flow | call tree (`diff` for added/removed calls) |
| logic or state | pseudocode (`diff` for a changed branch) |
| refactor / file moves | shallow file tree as a `diff` |
| client ↔ Convex ↔ service flow | Mermaid `sequenceDiagram` |
| a new function or validator | the whole block |

Keep only the calls, files, props and states the reviewer needs. Then bullets: what
changed, and what to look at first. For a Convex contract change, say "additive" and
who calls it.

## Surfaces touched

Tick the boxes, then one line: which surfaces you checked and why the rest are
unaffected (see "Hit every surface" in `AGENTS.md`).

## Merge danger

**Door.** Two-way if a revert fully undoes it. One-way if it doesn't. In this repo,
one-way means:

- a Convex function, arg or return shape that shipped mobile builds will call
  (store-gap rule: you can't take it back from old binaries)
- a schema change, backfill or migration that runs on prod data
- a native change that needs a store build (`native-change` label)
- deleting or rewriting user data
- anything that reaches users on merge: push, email, OTA

For a one-way door, say what makes it safe (additive only, deprecation path,
dry run).

**Blast radius.** One word (`none`, `cli`, `admin`, `web`, `mobile`, `all-clients`,
`prod-data`), then what breaks if this is wrong: crash, layout shift, signed-out users,
bad data, a failed deploy.

## Verification

Before and after, best evidence first (see `rules/testing.md`):

1. Screenshots, for visual changes (argent on mobile, browser pane on web/admin).
2. A test that failed before and passes now: name it, and what it asserts.
3. Command output or a manual run.

List the commands you ran. **Could not verify** is never blank: name what the
simulator or local setup can't prove, or write "nothing".

## Model & harness

Model, harness, and how the work started (e.g. side session from a review). Delete
the section if no agent wrote any of it.

# Ideas from three sample apps

Researched 2026-11-03. These are idea sparks, not port plans. Nothing here is decided.

| File | What's in it |
|---|---|
| [features.md](features.md) | Product feature ideas |
| [ui.md](ui.md) | UI / UX ideas |
| [workflows-ci.md](workflows-ci.md) | GitHub Actions, CI checks and release ideas |
| [tooling.md](tooling.md) | Agent tooling, evals, rules and dev tooling ideas |

## Sources

| Tag | Repo | What it is |
|---|---|---|
| **C** | `sample apps/companion-main` | Cal.com Companion: Expo app with iOS/Android home-screen widgets, a WXT browser extension that iframes the Expo web build, and a Commander CLI. bun workspaces, Biome. |
| **P** | `sample apps/private-mind-main` | Software Mansion's Private Mind: fully on-device LLM chat (react-native-executorch), on-device RAG with citations, phone-side web search, Whisper dictation, chat branching. No backend. |
| **R** | `sample apps/rakazo-main` | Rakazo: self-hostable "persistent AI teammate". Bots with one long thread, memory, routines, approvals, messaging channels; web, Electron, Expo. pnpm + turbo. |

Each item names its source tag. File paths are relative to that sample repo's root. "Xolace has
none" claims were spot-checked against `apps/mobile` and `packages/backend/convex` on this date
(no widget targets, no notification categories, no Maestro, no on-device inference, no
user-authored routines).

## Shortlist

If we only pick six, these give the most "proactive and different" for the effort:

1. **User-authored routines + silent runs** (R): the companion schedules what the user asks for, and a nightly pass may decide *not* to speak. [features](features.md#proactivity)
2. **Actionable follow-up notifications** (C): answer a check-in from the lock screen. [features](features.md#proactivity)
3. **Home-screen / lock-screen widget** (C): next check-in, streak and a one-tap vent. [features](features.md#proactivity)
4. **"How I support you" contract the companion proposes edits to** (R): the user approves a diff and can undo it. [features](features.md#memory-and-understanding)
5. **Vault mode** (P): on-device vent/journal where nothing leaves the phone. [features](features.md#privacy-as-a-feature)
6. **Two-layer agent evals incl. "should stay silent" and "crisis always escalates"** (R): makes the above safe to ship. [tooling](tooling.md)

## Looked at and skipped

- **Rakazo's sandboxed computers and browser takeover.** Desktop automation with a large security surface.
- **Rakazo's multi-bot teams as a user feature.** Users shouldn't manage several bots. The parts worth taking (specialists behind one face, silent wakes, a goals board, archived chapters) are in [features.md](features.md#ideas-from-the-multi-bot-setup).
- **Rakazo's open connector marketplace, BYO models and self-hosting.** Letting users plug any third-party tool into the companion conflicts with clinical safety. Messaging channels, inbound webhooks and a curated, read-mostly catalog are *not* skipped: see [features.md](features.md#connectors-what-xolace-can-see-and-do-outside-itself).
- **Private Mind's model hub, custom model import and benchmark screen as user features.** Users shouldn't pick models; hide it all behind "Vault mode on/off".
- **Private Mind's DuckDuckGo scraper and VLM photo understanding.** Fragile, anti-bot challenges, and vision models need ~7 GB RAM.
- **Companion's OpenAPI-generated CLI, cookie web auth and LinkedIn DOM injection.** We have a typed Convex contract and Clerk; scraping social sites doesn't fit the brand.
- **Monorepo/release tooling in all three.** Xolace's Turborepo, `check:changed`, worktree ports, fingerprint and preview workflows are already ahead.

## Decisions so far (2026-11-03)

1. **Vault mode: yes, as an informed opt-in.** Processing stays on the device; users are told plainly what that means (including that server-side escalation doesn't see Vault content) and choose it. A local crisis gate that opens `crisis-resources` is still worth building.
2. **Xolace speaking first is the goal.** Routines, silent runs, webhook triggers, SMS and widgets all serve it. Silent runs and a per-user cap remain the guard against nagging.

## Still open

1. **What can show on a lock screen or in a notification preview?** Parked; needs one rule before widgets or actionable pushes ship.
2. **Do companion-proposed instruction changes live in `semanticProfiles` or a new user-visible table?**
3. **Connectors: build each OAuth ourselves or use Composio/Pipedream?** A data-processor and consent question as much as an engineering one.

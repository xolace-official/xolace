# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

Layout: **single-context**. Every surface (mobile, web, desktop, admin, cli, docs) shares one product domain and one Convex backend, so there is one glossary and one ADR folder for the whole repo.

## Before exploring, read these

- **`GLOSSARY.md`** at the repo root. Until it exists, the `## Glossary` section of `AGENTS.md` is the glossary.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.
- **`docs/plan/`**: longer-form plans (e.g. `workspace-migration-plan.md`) that record decisions not yet split into ADRs.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-one-convex-backend-for-all-clients.md
│   └── 0002-additive-only-contract-changes.md
├── apps/
└── packages/
```

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in the glossary. Don't drift to synonyms the glossary explicitly avoids (e.g. "user" vs "admin" vs "agent", "surface", "deployment").

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0007 (event-sourced orders), but worth reopening because…_

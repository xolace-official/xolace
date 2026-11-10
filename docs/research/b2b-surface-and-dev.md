# Developer surfaces and a B2B edition: reaching founders where they work

Researched 2026-10-30. Companion to [`proactive-outreach-channels.md`](./proactive-outreach-channels.md); this doc builds on its "Current Xolace follow-up state" and "Recommended architecture on Convex" and does not repeat them. Specs in this space (MCP, Claude Code, Cursor, Codex, Slack's agent APIs) changed several times in 2026; re-check before building. Tags: **[V]** checked on a primary source this session, **[S]** secondary source only, **[U]** unverified.

## TL;DR

Developers and founders already spend the day inside a terminal, an editor and, more and more, an AI coding agent. Every one of those surfaces can show something, but **almost none can start a conversation**. The 2026-07-28 MCP spec made MCP stateless: a server only speaks when a client asks [V]. So the plan below keeps the brain in Convex and uses dev surfaces as **pull channels**: a small local agent syncs "a check-in is waiting" to a cached file, and the prompt, status line, agent hook or menu bar reads that file. The user starts the check-in; we only make it visible.

Ranked recommendations:

1. **Ship `xolace checkin` in the CLI now, with no backend change.** `followUps.getReadyCard`, `followUps.markReturn` and `followUpResponses.record` are already public, Clerk-authed functions. The CLI already holds an OAuth session that maps to the same `tokenIdentifier` as mobile (`auth.config.ts`). A TUI that shows the ready card and records `lighter / still_here / heavier` is a few hundred lines in `apps/cli/src/`. (D1)
2. **A local-state file plus a one-shot sync job, not a daemon.** `xolace sync` runs every 15-30 min from launchd, `systemd --user` or Task Scheduler. It refreshes the token through the existing locked `session.getIdToken`, asks Convex for a minimal "pending" payload and writes `~/.local/state/xolace/pending` (a few bytes, content-free). Prompts, status lines and hooks only `cat` that file: no network and no Bun startup on every prompt.
3. **A Claude Code plugin is the biggest new opening.** One install (`/plugin install xolace@…`) can bundle a `SessionStart` hook that prints a user-visible `systemMessage` ("A Xolace check-in is waiting: /xolace:checkin"), a remote Xolace MCP server with a check-in tool and prompt, and an optional status-line snippet. Codex hooks support the same `systemMessage` [V]. Cursor's `sessionStart` can't show text to the user [V], so Cursor gets the MCP server and the VS Code extension only. (D2)
4. **A remote Xolace MCP server, stateless, hosted on Convex HTTP actions, authed by Clerk OAuth.** Tools: `get_check_in`, `record_check_in`, `start_breather`. Answer buttons through elicitation form mode [V], and a check-in card through **MCP Apps** where hosts support them (Claude, Claude Desktop, VS Code Copilot, M365 Copilot, Goose) [V]. It can't ping anyone. It is the surface the user opens when the hook or status line says something is waiting. (D4)
5. **Opt-in, local-first strain signals from the dev surfaces themselves.** The most distinctive one is new: **AI-agent session timestamps** from the same Claude Code / Codex hooks (sessions running past 1am, three nights in a week). Git commit hours, WakaTime totals and CI failure streaks are the others. Compute everything on the machine; send Convex only a coarse flag ("late nights ×3 this week") that *schedules* a daytime check-in. Never send repo names, messages or code. (D3)
6. **Menu bar presence: Raycast first, Tauri tray later.** A Raycast `menu-bar` command with `interval` background refresh is a small TypeScript project and reaches Mac founders [V]. A Tauri tray needs `tray-icon` plus Rust code in `apps/desktop/src-tauri` and a desktop app that is still a placeholder [V]. (D5)
7. **VS Code / Open VSX extension later.** It adds a status bar item, notification with buttons and a webview check-in, and can register the Xolace MCP server through `lm.registerMcpServerDefinitionProvider` [V]. It reaches VS Code, Cursor and Windsurf users.
8. **Communities: be invited, never DM.** A Discord bot with user-run `/checkin` commands in two or three founder servers; no unprompted DMs (Discord's docs discourage them [V, companion]). No GitHub App, no X or LinkedIn DMs.
9. **B2B: design the org model before building Slack.** Clerk Organizations (roles, verified domains, enterprise SSO; 100 free retained orgs in production) [V] give sponsorship, not visibility: the employer pays and sees **aggregates only**, behind a k-anonymity floor. In Slack, two hard rules shape everything. The Marketplace lists apps that "share sensitive personal information, such as … health information in Slack" as unsuitable [V]. Custom workflow steps can't be distributed or listed at all [V]. So the Slack check-in must be **content-free in Slack** ("your check-in is ready"), with the answer collected in Xolace, unless a customer installs it privately. Teams has the same shape: proactive DMs only after the app is installed for the user, which an admin can do in bulk through Graph [V].
10. **Reuse from `convex-slack`:** the OAuth v2 install with token rotation, the signing-secret check with a 5-minute replay window, `event_id` dedupe, `scheduleMessage`, `publishHomeView` and the retrying API client. **Don't** reuse its message, channel and user mirroring; least privilege is a Marketplace rule too [V].

**White space:** no wellbeing product lives inside AI coding agents. Founder mental-health offers are coaching, pledges and directories (Reboot, FounderPledge, Brex Catharsis) [S], and none reaches out. Developer "take a break" tools are timers [S]. Workplace check-in bots like Kona show answers to managers [S]. A care-grade, private follow-up that appears in the terminal or agent you already have open, and that only you can see, is unclaimed.

## What the CLI already gives us

From `apps/cli/` (read 2026-10-30):

- **Auth:** Clerk OAuth for a public client: PKCE with a loopback redirect, plus the RFC 8628 device grant (`xolace login --device`, the default over SSH) (`src/auth/oauth.ts`, `browser.ts`). Scopes are `openid profile email offline_access`.
- **Tokens:** OS keychain through `@napi-rs/keyring`, else a `0600` file (`token-store.ts`). Clerk rotates the refresh token on every refresh. `session.ts` serialises refreshes behind a cross-process lock (`file-lock.ts`). **This matters:** a background `xolace sync` and an open TUI can share the session safely as long as both go through `session.getIdToken`.
- **Backend identity:** Convex accepts the OAuth ID token as a second provider with `applicationID = CLERK_OAUTH_CLIENT_ID`. "Same issuer, so the same person gets the same `tokenIdentifier` … and the same `users` row" (`packages/backend/convex/auth.config.ts`). Tokens carry no `role` claim, so admin functions reject them.
- **Commands today:** `login`, `logout`, `whoami`, and a TUI (`ConvexReactClient` over a websocket) (`src/index.tsx`).
- **Runtime:** Bun; OpenTUI React; no DOM. Config comes from `XOLACE_*` env names; prod defaults are planned "with distribution" (`apps/cli/AGENTS.md`).
- **Desktop:** Tauri 2.12 with `updater` and `dialog` plugins only. No tray or notification plugin yet; it loads the static web export (`apps/desktop/src-tauri/Cargo.toml`, `tauri.conf.json`).

## Developer surfaces matrix

"Initiate" means the surface can put something in front of the user without the user acting first. "Effort" is for our stack.

| Surface | Can it initiate? | Install path | Effort | Annoyance risk | Fit |
|---|---|---|---|---|---|
| **CLI `xolace checkin` (TUI)** | No; user runs it | `brew` / `bunx` / binary | **Low** (backend exists) | None | **High**: the answer surface everything else points to |
| **Shell prompt** (zsh `precmd`, fish, starship `custom`) | Passive, on every prompt | `xolace init zsh >> ~/.zshrc`; starship TOML snippet | Low | Medium: the prompt is precious; one glyph only | High |
| **MOTD / login banner** | Passive, on shell or SSH login | `xolace init` adds a line to the rc file | Low | Low | Medium |
| **tmux / zellij status** | Passive | `#(cat …)` in `status-right`; a zellij plugin is Wasm [U] | Low (tmux) | Low | Medium |
| **Terminal notification escapes** (OSC 9 / 777 / kitty OSC 99) | Yes, but only from a process running **in** that terminal | Emitted by the prompt hook | Low | **High** if more than once a day | Low-Med |
| **Native OS notification** (launchd + `osascript` / `terminal-notifier` / `notify-send`) | **Yes** | `xolace agent install` writes a LaunchAgent / user unit | Med | Medium; must honour the Quiet Window | Medium |
| **Claude Code plugin** (hooks + MCP + status line) | At session start, via a hook | `/plugin marketplace add` → `/plugin install` [V] | **Low-Med** | Low if one line per day | **Very high** |
| **Codex hooks** | At session start (`systemMessage`) [V] | `~/.codex/hooks.json`, trusted through `/hooks` [V] | Low | Low | High |
| **Cursor** | No: `sessionStart` can't show text [V] | MCP config + VS Code extension | Low (reuse) | Low | Medium |
| **Remote MCP server** | **No** (stateless; only list-change notifications) [V] | `claude mcp add --transport http …`, a connector in Claude.ai/Desktop | Med | None | High as the answer surface |
| **MCP Apps** (UI in chat) | No | Same server; host-dependent [V] | Med | None | High in Claude Desktop/claude.ai |
| **Claude Code channels** | Yes, pushes into an open session [V] | **Research preview; allowlisted plugins only** [V] | Med | High | **Blocked for now** |
| **Claude Code status line** | Passive | `statusLine` command in settings; `refreshInterval` [V] | Low | Low | High |
| **VS Code / Open VSX extension** | Yes (notification with buttons) [S] | Marketplace / Open VSX | Med | Medium | Medium-High |
| **JetBrains plugin** | Yes (balloon notification) [U] | JetBrains Marketplace | High (Kotlin) | Medium | Low (later) |
| **Raycast extension** (menu bar) | Passive; refreshes on an `interval` [V] | Raycast Store | Low-Med | Low | High for Mac founders |
| **Tauri tray** (`apps/desktop`) | Yes (tray + notifications) | The desktop app | Med-High | Low | Medium (after Phase 4) |
| **Discord bot** in founder servers | No unprompted DMs [V, companion] | Server admin adds the bot | Med | Low if user-run | Medium |
| **Slack community workspaces** | Only where installed; needs that workspace's admin | n/a | n/a | High | **Low** |
| **GitHub App** | Could comment or open issues; **inappropriate** | n/a | n/a | Very high | **No** |
| **X / LinkedIn DMs** | X: paid API, about $0.015/DM [S]; LinkedIn messaging is partner-only [U] | n/a | n/a | Very high | **No** |
| **Telegram** | Yes, after Start | See companion doc | Low | Low | High (already planned) |

## Per-surface notes

### 1. Ambient terminal presence

**The rule:** no network and no Bun process on the hot path. Even a compiled Bun binary costs process startup on every prompt. Starship kills commands after its global `command_timeout` (default 500 ms) unless `ignore_timeout` is set [V]. So `xolace sync` (see §2) writes a tiny **content-free** file, and everything below just reads it:

```
~/.local/state/xolace/pending      # e.g. "1" or "1 elevated" ; absent = nothing waiting
~/.local/state/xolace/shown-at     # last time any ambient surface showed it (for once-a-day)
```

The file must never hold card text. A terminal is screen-shared, recorded and pasted into issues more than any phone lock screen; the companion doc's rule that "the lock screen isn't private" applies twice over.

- **zsh:** `xolace init zsh` prints a `precmd` function that does `[[ -s $XDG_STATE_HOME/xolace/pending ]] && RPROMPT='%F{magenta}◐%f'`. That is a builtin test with no fork. fish: a `fish_right_prompt` function with `test -s`. bash: `PROMPT_COMMAND`.
- **starship:** a `[custom.xolace]` module with `when = 'test -s ~/.local/state/xolace/pending'`, `command = 'echo ◐'`, and a non-login `shell`. Starship's docs warn that a shell loading its full profile adds time "on every starship invocation" [V]. `when` accepts a shell command whose exit status 0 shows the module [V].
- **MOTD / new shell banner:** one line, at most once per day, in the rc snippet: "◐ Xolace has a check-in for you · `xolace checkin`". The real `/etc/motd` is system-wide and needs root, so use the rc file.
- **tmux:** `set -g status-right '#(test -s ~/.local/state/xolace/pending && echo ◐)'`. tmux re-runs `#()` on its status interval [S]. zellij status bars are Wasm plugins [U]; skip.
- **Terminal notification escapes:** iTerm2's OSC 9 and the rxvt-style OSC 777 are the common pair. kitty supports OSC 9 and its own **OSC 99, which can carry buttons and report the click back to the program** when `a=report` is set [V]. Ghostty handles OSC 9 and 777 behind `desktop-notifications` (default on) [S]. tmux needs `allow-passthrough` to forward them [S]. The catch: the escape must come from a process attached to that terminal, i.e. the prompt hook. Use it at most once a day, and only when the terminal is unfocused if detectable. Not worth more than that.
- **Claude Code status line:** runs any command with JSON session data on stdin, debounced at 300 ms. An optional `refreshInterval` (minimum 1 s) re-runs it on a timer [V]. A `cat` of the state file costs nothing.

### 2. A background sync job, not a resident daemon

**Shape:** `xolace sync` is a one-shot command. It:
1. calls `session.getIdToken()` (locked refresh, shared with the TUI);
2. runs one Convex HTTP query (`ConvexHttpClient`, not the websocket client) for a minimal payload (`{ pending: boolean, tier, cardId, reachHint }`);
3. writes the state file;
4. optionally fires one native notification, if the router said this device may notify and the Quiet Window allows it.

The OS scheduler runs it every 15-30 minutes: a launchd `LaunchAgent` with `StartInterval`, a `systemd --user` timer, or a Task Scheduler task [S, standard OS facilities]. `xolace agent install|uninstall|status` writes and removes these files. A resident process holding a Convex websocket would be reactive, but it costs battery and memory and looks like spyware in Activity Monitor. A 15-minute pull matches the follow-up cadence: the fastest nudge is 45 minutes (acute).

**Notifications from a CLI:** a bare binary has no app bundle, so on macOS it can't use `UNUserNotificationCenter` directly [U]. Options:
- `osascript -e 'display notification …'` works, but the notification is attributed to Script Editor [S].
- `terminal-notifier` is a small app bundle with a sender option [S].
- Hand off to the Tauri app or the Raycast extension once they exist.
- Linux: `notify-send`. Windows: a toast through PowerShell [U].

Start with no OS notification at all (D1/D2 need only the state file). Add `osascript` behind an explicit flag.

**Bun suitability:** fine for a one-shot job. Startup cost doesn't matter every 15 minutes. `bun build --compile` produces a single executable with cross-compile targets such as `bun-darwin-arm64` [S]. Bun 1.4.1 fixed rare `codesign -v` failures for darwin-arm64 binaries [S]. A downloaded binary needs Developer ID signing and notarization to pass Gatekeeper [U for our case]. Homebrew installs avoid the quarantine prompt [S].

**How others do it:** `brew autoupdate` installs a launchd agent that runs on an interval [S]. WakaTime editor plugins send heartbeats from the editor process rather than running a daemon [V: API docs say keys are for plugins]. Raycast runs `interval` commands but lets macOS pick the timing on battery [V]. `gh` extensions are plain executables run on demand [S]. Nobody we found runs a wellbeing daemon.

**Trust:** publish exactly what the job sends and receives (one query, no file reads), make `xolace agent status` print the last run, and keep it off by default.

### 3. Strain signals from developer activity

Opt-in per signal, computed locally, sent as a **coarse flag** that schedules a check-in for a sensible hour (the next late morning in the user's timezone), never at 2am.

| Signal | Where it comes from | Local or API | Feasibility | Notes |
|---|---|---|---|---|
| **Late-night AI-agent sessions** | Claude Code `SessionStart`/`SessionEnd`/`Stop` hooks [V]; Codex `SessionStart`/`Stop`/`SessionEnd` [V]; Cursor `sessionStart`/`sessionEnd` [V] | Local | **High**: the plugin already installs these hooks; append a timestamp to a local log | New signal: agent-driven all-nighters. Count sessions starting after 00:30 local time |
| **Late-night / weekend commits** | `git log --author=<email> --since=… --format=%aI` over repos the user names | Local | High | A global `core.hooksPath` would override every repo's own hooks; scan instead |
| **Long uninterrupted sessions** | zsh `precmd` timestamps; agent hook timestamps | Local | Medium | A 4h+ continuous run without a 15-min gap |
| **Coding time** | WakaTime API: OAuth with `read_summaries`/`read_heartbeats`, durations per day, <10 req/s averaged over 5 min [V] | API | Medium (WakaTime users only) | Read daily totals only |
| **Contribution pattern** | GitHub GraphQL `contributionsCollection`; REST user events (recent ~90 days) [S] | API | Medium | Public activity only; coarse |
| **Failing-build streaks** | GitHub Actions workflow runs API [S] | API | Low-Med | Noisy; a weak signal |
| **Calendar density** | Google Calendar `freeBusy` [S] or on-device | API | Medium | Better done on mobile (companion E6) |

**Design rules:**
- Use **personal baselines**, not absolute thresholds. Night owls aren't in crisis; a change from their own normal is the signal. Timezone travel will cause false positives; let the user pause signals.
- **Never diagnose.** The copy is about the week ("Three late nights this week. Want two minutes tomorrow?").
- **Data minimisation:** add a `strain_signals` row with `{ source, kind, windowStart, count }`. No repo names, commit messages, file paths or code. This also keeps us away from anything that resembles employee monitoring.
- **Never available to an employer**, even in aggregate (see B2B).

**Prior art:** no project called `git-wellbeing` turned up [S: search]. What exists:
- Blog posts and a playbook skill that count commits by hour and flag weekend work [S].
- An n8n template that scores *team* burnout from GitHub activity [S].
- Commercial burnout scores from GitHub data (CodexPulse, GitSpirit) [S].
- RescueTime-style time trackers [U: not re-checked].

All of them report or score; none starts a caring follow-up, and the team versions point the data at managers.

### 4. AI coding-agent surfaces (in depth)

These are where developers and founders now spend hours each day, often late at night, waiting on an agent. Each one lets a third party do something different.

#### What the MCP spec allows (2026-07-28)

- **Stateless protocol.** No `initialize` handshake and no protocol sessions; every request carries its version and client capabilities in `_meta` [V].
- **No server-initiated requests.** Elicitation, sampling and roots now go through the Multi Round-Trip Request pattern: during a client's request, the server returns `InputRequiredResult` and the client retries with answers [V]. **A server can't speak first.** `subscriptions/listen` streams only list-changed and resource-update notifications to clients that opted in [V]. Hosts don't turn these into user-facing pings.
- **Features:** tools, resources and prompts on the server; elicitation on the client [V]. **Sampling, roots and logging are deprecated** [V]; don't build on them.
- **Elicitation:**
  - Form mode is flat primitives and enums [V]. A `lighter / about the same / heavier` single-select plus an optional text field fits exactly.
  - Servers "MUST NOT" use form mode for secrets [V]. Feelings aren't secrets under the spec's definition, but form answers pass through the client and possibly into model context.
  - **URL mode** opens our own page and keeps the data out of the client [V]. Use it for the reflection text if we want it never to reach the model provider.
- **MCP Apps** (an extension): a tool declares a `ui://` resource that the host renders in a sandboxed iframe, and the app can call our tools [V]. Hosts: Claude, Claude Desktop, VS Code Copilot, Microsoft 365 Copilot, Goose, Postman, MCPJam, Archestra [V]. That gives a real check-in card inside the chat.
- **Prompts** are user-invoked templates [V]. Claude Code exposes MCP prompts as slash commands [S]. They are the natural "/xolace checkin" entry.

**Auth:** Clerk supports building an MCP server protected by Clerk OAuth (`@clerk/mcp-tools`, protected-resource metadata) and supports both CIMD and dynamic client registration [S: Clerk docs search]. The spec now deprecates DCR in favour of CIMD [V]. **Gap to design:** MCP clients will get Clerk tokens issued to *their* client IDs, not the CLI's. Our `auth.config.ts` accepts `aud` = `convex` or the CLI's client ID only. The MCP endpoint (a Convex `httpAction`) must verify the token itself and then call internal functions with the resolved `tokenIdentifier`, or Convex auth config must add a provider entry [U: needs a spike].

**Hosting:** statelessness suits a Convex `httpAction` at `/mcp` (Streamable HTTP, no session store). It is a new client-facing contract, so it follows the store-gap rule like any other.

**Model-context privacy:** anything a tool returns, or a hook adds as context, can be sent to the model provider (Anthropic, OpenAI, Cursor's providers). Default to **user-visible, not model-visible** text. Tool results carry only what the user just chose to share. Never put card content in hook `additionalContext`.

#### Claude Code

- **Hooks** (33 events) [V]:
  - **Configured in:** `~/.claude/settings.json`, project settings, managed policy, **plugin `hooks/hooks.json`**, skill or subagent frontmatter [V].
  - **`SessionStart`:** context only. Plain stdout goes into Claude's context, which we must **not** use for this [V]. The universal `systemMessage` field is shown **to the user** [V], and so is stderr on exit 2 [V].
  - **`terminalSequence`:** a hook may return one to trigger a desktop notification, window title or bell. Hooks can't write to `/dev/tty` [V].
  - **`Stop`:** can block Claude from stopping and continue the conversation [V]. **Don't use it**; hijacking the agent loop for wellbeing would be hostile.
  - **`Notification`:** side effects only [V]. Good for timestamp logging (D3).
- **Plan:** a `SessionStart` hook runs `xolace hook session-start`. It reads the state file and the `shown-at` file, and at most once a day prints `{"systemMessage":"◐ A Xolace check-in is waiting · /xolace:checkin"}`. It costs nothing when nothing is waiting.
- **Status line:** the same one-glyph read [V]. A plugin can't own the user's whole status line [U]; ship a snippet the user pastes in.
- **Plugins:** bundle hooks, MCP servers and commands. They install from a marketplace (`/plugin marketplace add <repo>`, then `/plugin install name@marketplace`) [V]. Host our own marketplace repo (e.g. `xolace-official/claude-plugins`). Getting into `claude-plugins-official` is a separate review [U].
- **Channels:** an MCP server that pushes events into an open session (Telegram, Discord and iMessage are the reference plugins) [V]. This is the only agent surface that can initiate. But:
  - It is a **research preview**.
  - `--channels` accepts only plugins on Anthropic's allowlist or an org allowlist; others need `--dangerously-load-development-channels` [V].
  - Team/Enterprise orgs block channels until an Owner enables them [V].
  - Claude Code doesn't register a channel server that negotiates the 2026-07-28 protocol [V].
  - **Watch, don't build.** A channel would also inject our message into the model's context, which conflicts with the privacy rule above.

#### Codex (OpenAI)

Hooks are on by default (`[features] hooks = false` disables them). They live in `~/.codex/hooks.json` or `config.toml` and the repo-level equivalents, and non-managed hooks must be reviewed and trusted via `/hooks` [V]. `SessionStart` matchers are `startup / resume / clear / compact / fork`. `systemMessage` is "surfaced as a warning in the UI" [V]. Plain stdout becomes developer context (avoid). Plugins can supply hooks too [V]. **Same plan as Claude Code**, through the same `xolace hook` command. Codex also reads MCP servers [S].

#### Cursor

Hooks live in `~/.cursor/hooks.json`, `<project>/.cursor/hooks.json`, team (Enterprise) and MDM locations [V]. `sessionStart` accepts `additional_context` (model-visible), and its `user_message` "is accepted by the schema, but current callers do not enforce" it [V]. `stop` can auto-submit a `followup_message` as the next user message [V]; don't. **No user-visible path from a hook today.** Cursor gets the MCP server (prompts and tools) plus the VS Code extension's status bar item; Cursor runs Open VSX extensions [S].

#### VS Code (and forks)

The extension API offers a status bar item, information messages with buttons and webview panels [S: standard API, not re-read]. **`lm.registerMcpServerDefinitionProvider`** lets an extension publish MCP servers for the editor [V]: installing the extension auto-registers the Xolace MCP server for Copilot agent mode. Publish to both the VS Code Marketplace and Open VSX. The extension reads the same state file; it can also fetch on focus and notify at most once a day.

#### JetBrains

A Kotlin plugin with a status bar widget and balloon notifications [U]. Higher effort and a smaller founder overlap. Later, or never; JetBrains AI also speaks MCP [U].

#### Raycast and menu bar apps

- **Raycast:**
  - Commands in `menu-bar` or `no-view` mode can declare `interval` (minimum `10s`) [V].
  - Background refresh starts **disabled** for Store installs until the user opens the command [V], which is good consent hygiene.
  - macOS shifts timing on battery [V].
  - A `menu-bar` command showing ◐ with "Check in (2 min)" opening a Raycast form that calls our Convex HTTP API is about a week of work in TypeScript/React. Auth: Raycast's OAuth PKCE utilities against Clerk [U].
- **Tauri (`apps/desktop`):** the tray needs the `tray-icon` Cargo feature and `TrayIconBuilder` in Rust. Tray click events are **not emitted on Linux** [V]. Add `tauri-plugin-notification` for native notifications [U]. The desktop app is the right long-term home for a native notifier with a proper bundle ID, but it waits on Phase 4 web work.

### 5. Communities where founders already are

- **Discord:**
  - Many founder and indie-hacker communities run on Discord [S].
  - The docs say DMs "should generally be initiated by a user action" [V, companion].
  - Model: a bot a server admin invites. It offers `/checkin` (ephemeral reply, links the account via a one-time link) and a weekly opt-in prompt in a channel the community chose.
  - Discord also has user-installable apps whose commands work anywhere for that user [S], a lighter path that needs no server admin.
- **Slack communities:** community workspaces rarely let members install apps, and an app needs that workspace's admin. Not a consumer channel. Revisit only through B2B.
- **GitHub:** a GitHub App that opens issues, comments or DMs (GitHub has no DMs) about wellbeing would be intrusive and off-purpose. **Don't.** The legitimate GitHub touchpoints are the open-source CLI and plugin repos themselves and a Sponsors-style "Xolace for maintainers" offer [U: idea only].
- **X:** DMs need the highest permission level and cost about $0.015 per DM sent under pay-per-use pricing (launched Feb 2026) [S]. Cold or bot DMs about mental health would read as spam. **No.**
- **LinkedIn:** the messaging API is limited to approved partners [U]. **No.**
- **Telegram:** see the companion doc's Telegram notes; it is already the first messaging adapter.

### 6. Prior art and competitors for developers and founders

| Product / project | What it does | Proactive? | Gap Xolace fills |
|---|---|---|---|
| **OSMI** (Open Sourcing Mental Health/Illness) | Talks, handbooks, the Mental Health in Tech survey; the latest survey we could confirm is 2022 [S] | No | Resources, not follow-up |
| **Reboot** (Jerry Colonna) | Founder and CEO coaching, team programs, podcast [S] | No (human coaching) | Daily, private, cheap |
| **Founder Mental Health Pledge** (founderpledge.com) | Investor pledge plus a resources directory (80+ resources reported) [S] | No | A directory, not a companion |
| **Brex Catharsis** | Founder mental-health program and resources [S] | No | n/a |
| **Felicis "1%" founder-development fund** | Non-dilutive money for coaching and mental health [S] | No | A funding source; possible B2B buyer |
| **YC** | Advice (e.g. "Erin Frey on Therapy", 2017); no formal founder therapy benefit found [S] | No | n/a |
| **VS Code break extensions** (Mindful Coding, CodeFit, DevPace, Break Timer Pro) | Fixed-interval break and stretch reminders; DevPace uses an LLM for encouragement [S] | Timer only | No memory, no follow-up |
| **`jrnl`** | Plain-text CLI journal, optional AES encryption [S] | No | No prompting, no AI, no follow-up |
| **Kona** (Slack) | Daily red/yellow/green team check-ins; **managers see direct reports' check-ins** [S] | Yes, to the team | Private-to-the-person by design |
| **Viva Insights Reflect** (Teams) | Emoji mood check-in with an optional daily reminder; "No one else can see what you choose" [V] | Reminder | No conversation, no follow-up |
| **Burnout scoring from GitHub** (n8n template, CodexPulse, GitSpirit) | Scores late-night and weekend activity [S] | Reports | Signals that lead to care, not dashboards |

**White space:**
1. Nothing caring lives inside AI coding agents.
2. Developer tools remind on timers. None remembers what you said last week and follows up on it, which is what Xolace's follow-up cards already do.
3. Founder-specific offers are human, expensive or static.
4. Team tools aim the data at managers; a person-owned check-in with employer-blind privacy is the trustworthy version.

### 7. Constraints that shape all of this

- **Runtime:** Bun, no DOM (`apps/cli/AGENTS.md`). The MCP server runs on Convex, not Bun. Raycast and VS Code extensions are separate Node/TS projects; check whether they belong in this monorepo (`apps/raycast`, `apps/vscode`) under the "apps ship" layout rule.
- **Distribution:**
  - `bunx @xolace/cli` needs Bun on the machine, which is fine for developers.
  - Homebrew tap: `xolace-official/tap`.
  - Compiled binaries via `bun build --compile` for darwin-arm64/x64, linux-x64/arm64 and windows-x64 [S].
  - The CLI's prod config defaults still have to be built in (`apps/cli/AGENTS.md`, "with distribution").
- **Auth:** done for CLI and desktop. MCP needs the OAuth-for-MCP spike above. Raycast and VS Code can reuse PKCE with a new Clerk OAuth app each, or the device grant.
- **No admin from these clients:** OAuth tokens carry no `role` [repo]. Keep it that way.

## Strain-signal triggers: local-first design

```
 shell precmd ─┐
 agent hooks ──┼─▶ ~/.local/state/xolace/activity.log   (timestamps only, 30-day rotation)
 git log scan ─┘                │
 WakaTime/GitHub (opt-in) ──────┤
                                ▼
                  xolace sync: features vs personal baseline (local)
                                │  only if a rule fires
                                ▼
       outreach.reportSignal({ kind: "late_nights", count: 3, window: "7d" })
                                │
                                ▼
       router: consent `dev_signal_ingest`? escalation guard? rate bucket?
                → schedule a `check_in` intent for tomorrow 10:30 local
                → delivered on the user's chosen channel (state file, Telegram, push…)
```

- **Rules start simple and visible:** "3+ agent or commit sessions after 00:30 in 7 days", "a 5h+ session without a 15-min gap twice in a week", "coding time 40% above the 4-week median". `xolace signals` prints what fired and why.
- **Off by default per signal; nothing leaves the machine except the flag.** The user can see and clear `activity.log`.
- **The check-in copy names the pattern only if the user opted into that** ("You've had some late nights") **and otherwise stays generic.**

## B2B edition

### What a team/EAP edition needs

- **Org model (Clerk Organizations)** [V]:
  - Roles and permissions defined app-wide, default `admin` / `member` plus custom roles.
  - **Verified domains** auto-invite matching emails or suggest joining with admin approval.
  - **Enterprise connections** (SAML/OIDC) for IT-managed rollouts.
  - Billing is per Monthly Retained Organization: an org with 2+ members where at least one is a retained user. Free plans include 100 MROs in production.
  - The active org rides in the session token. Clerk warns that the cookie holds one active org per browser and recommends `getToken()` for multi-tenant requests [V]. The exact claim shape (`o` vs `org_id`) depends on the token version [U]; check before use.
- **Sponsorship, not ownership:**
  - The employee's Xolace account stays **personal**: same `users` row, same `tokenIdentifier`, the data stays with them when they leave.
  - Org membership only proves eligibility for a sponsored plan (an entitlement next to RevenueCat's).
  - Employer staff get a new **org-admin** role scoped to their org. It is distinct from Xolace staff `admin`; don't overload `convex/admin/*`. Use something like `convex/orgAdmin/*` with an `orgAdminQuery` builder that checks the org role claim.
- **Aggregate-only reporting:**
  - The employer sees only counts from a nightly job: seats activated, weekly active, sessions per active user, check-in response rate.
  - Every cell has a **k-anonymity floor** (suppress any cell with fewer than 10 people) [U: pick the threshold with counsel].
  - **No** mood distributions for small teams, **no** per-team cuts below the floor, **no** strain signals ever, **no** content.
  - Store aggregates in their own table so no org-admin query can reach per-person rows.
- **Contracts:** a DPA, possibly an EAP partner for clinical escalation, and crisis resources per country (reuse `ai/safeguard.ts` resources). HIPAA applies if we sell through a US health plan [U: legal question].
- **Install modes:**
  - *Workspace install*: an admin installs the Slack/Teams app for everyone; the app may say hello once.
  - *Individual linking*: each employee links their Xolace account inside Slack/Teams. **Only linked, consenting users ever get check-ins.** Workspace install without individual linking only enables an opt-in invitation.

### Slack (primary docs)

- **Messaging:**
  - `chat.postMessage` to a user ID opens or uses the app DM [S, companion].
  - `chat.scheduleMessage` takes a DM or user ID, schedules up to **120 days** ahead, allows at most **30 scheduled messages per 5 minutes per channel**, and is **Tier 3** (50+/min) [V].
  - Scheduled messages with `metadata` silently don't post [V]. The companion router owns timing anyway, so use `postMessage` from the outbox at send time and keep `scheduleMessage` for Quiet-Window-respecting sends days ahead, if at all.
- **App Home:** `views.publish` per user [S]. The Marketplace guidelines say to use the App Home Messages tab, not the Slackbot channel, and to ask consent there before emailing anyone [V]. Use the Home tab for settings: link account, check-in frequency, quiet hours, pause.
- **Agents & AI apps:**
  - Split-view container and DMs; up to 4 suggested prompts (`assistant.threads.setSuggestedPrompts`).
  - Status via `agents.sessions.setStatus`; the legacy `assistant.threads.*` still works through a bridge.
  - The `assistant:write` scope; `app_context_changed` events when `agent_view` is on.
  - "Some AI features require a paid plan" [V].
  - The docs set no rules on proactive messages beyond recommending a first-run call to action [V].
  - For Xolace this would be the Slack home for an *on-demand* companion, which makes the "health information in Slack" problem below worse, not better.
- **Workflow Builder custom steps:**
  - Need a paid plan, an org-ready app installed at org level, and `function_executed` handling [V].
  - "Cannot be distributed publicly or submitted to the Slack Marketplace" [V].
  - Only useful in a single enterprise deal (e.g. an HR onboarding workflow that offers Xolace).
- **Marketplace rules that bite** [V]:
  - Unsuitable: apps that "share sensitive personal information, such as financial or health information in Slack".
  - AI disclosure covers the model, retention, residency and inaccuracy. "DON'T use Slack data to train LLMs." "DON'T allow AI make consequential decisions without human review", which explicitly covers medical effects.
  - **Sentiment analysis** is allowed only at an aggregate level and transparently.
  - Notifications only to people who expect them, with configurable type and frequency.
  - A clear public privacy policy. Support replies within 2 business days.
  - 10+ active workspaces and 10+ weekly active users to list.
  - Review takes up to 10 weeks [V, companion].
  - Non-Marketplace apps get 1 req/min on `conversations.history` [V, companion], which we don't need.
- **Design consequence:**
  - **Marketplace build:** a content-free DM ("◐ Your Xolace check-in is ready", with a button that opens Xolace on mobile or web). The answer and any text stay off Slack. The App Home holds settings only.
  - **Private-install build** (one customer, off-Marketplace): the customer's security review may accept in-Slack buttons (`lighter / same / heavier`). Even then, free text should move to Xolace.
  - Check-ins never go into channels.

### Microsoft Teams

- **Proactive messages:**
  - Possible once the app is installed for the user (personal scope) or the user is in a team where it is installed.
  - The app stores the `conversationId` from the install event, or creates a 1:1 conversation with `aadObjectId` + tenant ID.
  - Proactive messages aren't supported via email or UPN.
  - A blocked or uninstalled bot returns **403 `MessageWritesBlocked`** [V].
- **Bulk install:** admins (or the app, via Graph) can **proactively install** the app for users, but only apps in the org catalog or the Teams Store [V]. This makes enterprise rollout one admin action.
- **Microsoft's best practices:** say why the user got the message, what they can do and **how to opt out**; use activity feed notifications when the action lives in a tab; send scheduled messages in the user's time zone [V]. These match the companion router's rules.
- **SDK:** the Teams SDK (formerly Teams AI Library) has a TypeScript flavour [V]. Bot registration needs an Azure bot resource [U]. Teams Store listing needs certification [U].

### Competitors in work tools

| Product | In Slack/Teams today | Proactive? | Privacy stance |
|---|---|---|---|
| **Viva Insights** (Microsoft) | Reflect (emoji mood check-in), virtual commute, quiet time, focus time [V] | **Daily reminder** to reflect, user-scheduled [V] | "No one else can see what you choose" [V] |
| **Headspace** | Was integrated into Viva Insights (2021); reportedly discontinued in 2024, links out to web now [S] | No | n/a |
| **Calm Business** | Teams app: Calm content in a meeting sidebar; no official Slack app found [S] | No | n/a |
| **Unmind** | Teams app: start page and a notification bot that helps activate accounts and explore resources [S] | Activation nudges | No mood check-in found [S] |
| **Kona** | Slack: daily team check-ins at an admin-set time; red/yellow/green [S] | **Yes, daily** | Managers see direct reports; skip-levels see trends [S] |
| **ECHO Pulse, Emotional Pulse, TeamMood** | Teams/email mood pulses [S] | Yes | Mixed; ECHO Pulse claims anonymous averages only [S] |
| **Modern Health** | Slack and Teams connectors per a third-party listing [U] | [U] | [U] |
| **Spring Health, Lyra** | No Slack/Teams app found [U] | n/a | n/a |

**Takeaway:** the incumbents either push content (Calm, Headspace), nudge activation (Unmind), remind you to rate a mood (Viva), or show your mood to your manager (Kona). Nobody does a **private follow-up on something you said**, delivered at work, with the employer blind to the content. That's the B2B pitch, and it rests on the same follow-up engine.

### Reusing `convex-slack` (`/Users/nathan/Developer/XolaceInc/sample apps/convex-slack-main`)

v0.0.3, Apache-2.0 (`package.json`). From `src/client/index.ts`, `src/component/schema.ts` and the README:

| Piece | Reuse? | Why |
|---|---|---|
| OAuth v2 multi-workspace install, one bot token per `team_id`, transparent token rotation (`resolveToken`) | **Yes** | Exactly the workspace-install mode |
| `verifySlackSignature` (HMAC v0, 5-minute replay window, constant-time compare) | **Yes** | Correct and small |
| `webhookEvents` dedupe on `event_id` | **Yes** (or fold into our `inbound_events`) | Slack retries |
| Retrying API client (429/5xx, `Retry-After`, `ratelimited`) | **Yes** | Feeds the outbox workpool |
| `postMessage`, `postEphemeral`, `scheduleMessage`, `publishHomeView`, `openView` | **Yes** | DM, App Home, settings modal |
| `messages`, `reactions`, `channels`, `users` mirrors driven by events | **No** | We must not store workspace messages. Least privilege is a Marketplace rule [V] |
| `interactions` / `commands` logs storing raw payloads | **Change** | A button payload *is* a check-in answer; route it into `inbound_events` → `followUpResponses`, with retention |
| `files` upload | No | Not needed |

**Recommendation:** for a pilot, install the component but request only `chat:write`, `im:write`, `commands` and `users:read` (to resolve the DM), and subscribe to `app_home_opened` plus interactivity only. Don't subscribe to `message.*` events. For Marketplace, or if the mirrors can't be switched off cleanly, copy the client pieces (~400 lines) into `convex/outreach/slack/` instead.

## How this plugs into the outreach layer

The companion's design (`channel_identities`, `channel_link_tokens`, `outreach_messages`, `inbound_events`, router) holds. Dev surfaces add a **pull** delivery mode; Slack and Teams are ordinary push adapters.

**Pull adapters** (`cli`, `agent_hook`, `ide`, `raycast`, `mcp`):
- The router writes an `outreach_messages` row with `status: "available"` instead of calling a provider.
- `xolace sync` (or the extension, or the MCP tool) calls a new **public** query, `outreach.pendingForMe`. It returns the minimal content-free payload for the caller's `tokenIdentifier` (through `requireAuth`).
- `outreach.ackShown({ messageId, surface })` marks it shown, so the "once a day across all surfaces" rule holds and `notification_log.landed` / `resultedInSession` keep working.
- The answer comes back through the **existing** `followUpResponses.record`, so no new inbound path is needed for the CLI.

**Identity linking:**
- The CLI and desktop already authenticate as the user via the Clerk device grant or PKCE, so **no link token is needed**. On `xolace agent install`, the CLI calls `outreach.registerDevice({ installationId, surface, platform })`. That adds a `channel_identities` row with `channel: "cli"` and `externalId: installationId` (random, stored locally). `xolace agent uninstall` and `logout` revoke it.
- Claude Code / Codex hooks are the CLI binary itself (`xolace hook …`) and reuse the CLI session.
- The MCP server identifies the user from its own Clerk OAuth token (see the auth gap above).
- Slack individual linking uses the companion's `channel_link_tokens`: App Home "Link Xolace" → a URL on our web app (Clerk session) → consume the token → `channel_identities { channel: "slack", externalId: "<team_id>:<user_id>" }`. Teams uses `<tenantId>:<aadObjectId>` plus the stored `conversationId`.

**Additive schema** (store-gap safe):
- `channel_identities.channel`: widen the union with `cli | agent_hook | ide | raycast | mcp | slack | teams | discord`.
- `outreach_messages.deliveryMode?: "push" | "pull"` (missing means push) and `status` gains `available`.
- New `strain_signals` table: `{ profileId, source: "agent_hooks"|"git"|"wakatime"|"github"|"shell", kind, count, windowStart, windowDays, createdAt }`, indexed `by_profile_created`. No free text.
- `consent_records.consentType` gains `dev_surface_outreach`, `dev_signal_ingest` and `workplace_outreach`.
- `preferences.outreach.channels` entries can name the new channels. Add `preferences.outreach.devSignals?: { agentHooks, git, wakatime, github }` booleans.
- B2B:
  - `org_sponsorships { clerkOrgId, plan, seats, status }`;
  - `org_memberships { clerkOrgId, tokenIdentifier, role, joinedAt }`, synced from Clerk webhooks through the existing `http.ts` pattern;
  - `org_aggregates { clerkOrgId, metric, period, value, suppressed }`.
  - All are new tables, so nothing old changes shape.

**Router additions:**
- Pull channels obey the Quiet Window too: the state file is written, but surfaces hide it inside the window.
- One ambient display per day across all pull surfaces (`outreachAmbient` bucket, 1/day).
- **Acute** tier never goes to a dev surface. Push or Live Activity only, because terminals are screen-shared.
- `strain_signals` can only *schedule* a `check_in` intent, which then goes through all the usual guards.
- Workplace channels never carry card content and never deliver `acute` or `elevated` copy.

**Hit every surface:**
- **Convex contract:** new functions only (`outreach.pendingForMe`, `ackShown`, `registerDevice`, `reportSignal`, `/mcp` route).
- **mobile:** a "Reach me on…" screen gains "Terminal & coding agents" and "Work (Slack/Teams)".
- **web:** the Slack/Teams link page; the MCP OAuth consent page.
- **desktop:** tray later.
- **admin:** a read-only view of device registrations and signals (`adminQuery`).
- **cli:** the main surface.
- **docs:** an `apps/docs` page "Xolace in your terminal and agents", with an exact data-flow table.

## Experiments

Numbered D1… to avoid clashing with the companion's E1-E9. Same instrumentation: PostHog flag and `notification_log` / `outreach_messages`.

| # | Hypothesis | Minimal build | Success metric |
|---|---|---|---|
| **D1** | Developers answer a follow-up in the terminal more often than from a push | `xolace checkin` TUI on the existing `getReadyCard` / `markReturn` / `followUpResponses.record`; `xolace init zsh` glyph from a state file written by an on-demand `xolace sync` | Card response rate among CLI-linked users vs their own push baseline; target +30% relative |
| **D2** | A once-a-day line at agent session start is welcome, not annoying | Claude Code plugin (own marketplace): `SessionStart` hook → `systemMessage`; Codex hook equivalent; `/xolace:checkin` via the MCP prompt or a plugin command | Check-ins started from the hook per active week; plugin uninstall rate <10% at 4 weeks; `landed=felt_right` share |
| **D3** | Late-night agent or commit sessions predict a check-in that lands | Local timestamp log from hooks plus a `git log` scan; rule "3 sessions after 00:30 in 7 days" → `reportSignal` → next-day 10:30 check-in | Response rate and `heavier` share for signal-triggered vs random-time check-ins |
| **D4** | An in-chat check-in card beats a text tool reply | Remote MCP server on Convex `/mcp` with an MCP Apps `ui://` check-in card; elicitation form fallback | Completion rate of started check-ins in MCP Apps hosts vs text-only hosts |
| **D5** | A quiet menu-bar presence sustains weekly check-ins without notifications | Raycast `menu-bar` command, `interval: 30m`, reading `pendingForMe` | 4-week retention of weekly check-ins among installers vs CLI-only users |
| **D6** | Founder communities accept a user-run check-in bot | Discord bot with `/checkin` and an opt-in weekly prompt channel, in 2-3 founder servers with the admins' blessing | Linked accounts per 100 members; admin removals (target 0) |
| **D7** | Employees use a private, content-free Slack nudge that resolves in Xolace | Off-Marketplace Slack app (`convex-slack` with minimal scopes) at 2-3 friendly startups; App Home settings, individual linking | Linking rate among invited employees; nudge → check-in conversion; employer satisfaction with aggregate-only reports |
| **D8** | A weekly "founder week" note with coding-time context feels useful, not creepy | Opt-in WakaTime/GitHub read; companion's Resend weekly note gains one line ("long week: 52h coding, 3 late nights") | Open → session rate; opt-out rate after the first note |

D2 and D3 are the novel ones: nobody puts a care-grade follow-up inside AI coding agents, and agent-session timing is a new strain signal. D1 needs no backend change at all.

## Roadmap placement

Relative to the companion's phases (0 Groundwork, 1 Telegram + email, 2 SMS, 3 Voice, 4 On-device, 5 WhatsApp, 6 Explore incl. Slack/EAP):

| Phase | Developer / B2B scope | Depends on |
|---|---|---|
| **Now, before Phase 0** | **D1:** `xolace checkin` TUI + `xolace init <shell>` + manual `xolace sync` (calls existing functions; the "pending" check can be `getReadyCard != null`) | Nothing new in the backend. CLI prod config defaults; Homebrew tap |
| **With Phase 0** | `outreach.pendingForMe` / `ackShown` / `registerDevice`; pull `deliveryMode`; `xolace agent install` (launchd / systemd / schtasks) | Companion Phase 0 tables and router |
| **With Phase 1** | **D2** Claude Code + Codex plugin (hooks + status line snippet); **D3** local signals with `strain_signals` and consent literals | Phase 0 router (scheduling a `check_in` intent) |
| **Phase 1b (2-3 wks)** | **D4** remote MCP server on Convex (`/mcp`, Clerk OAuth for MCP spike, elicitation, MCP Apps card); VS Code / Open VSX extension registering it | OAuth-for-MCP spike; web consent page (Phase 4 web) |
| **Phase 4 (with on-device)** | **D5** Raycast menu bar; Tauri tray + notification plugin in `apps/desktop` | Desktop beyond placeholder |
| **Phase 6 (Explore)** | **D6** Discord bot; **D7** Slack pilot; **D8** weekly founder note | Telegram adapter patterns (inbound, safeguard); Resend note |
| **B2B track (after D7 data)** | Clerk Organizations, `org_*` tables, `orgAdmin` functions, aggregate job with k-floor; Teams app; Slack Marketplace submission (content-free variant) | Legal review (DPA, EAP partner); 10 active workspaces for Marketplace |

## Not verified

- Clerk OAuth for MCP clients against our Convex `auth.config.ts` (`aud` per MCP client); whether to verify in the `httpAction` or add providers.
- Clerk session token org claim shape (`o` vs `org_id`) for org-admin checks.
- macOS notification from an unbundled CLI binary (`UNUserNotificationCenter` requirement); `osascript` attribution; Windows toast from a CLI.
- Keychain access (`@napi-rs/keyring`) from a launchd LaunchAgent without prompts.
- Ghostty's OSC 9/777 handling (only commit mirrors and third-party docs found); WezTerm and iTerm2 specifics; tmux `allow-passthrough`; zellij plugin model.
- Whether a Claude Code plugin can set or contribute to the status line; acceptance criteria for `claude-plugins-official`; Claude Code exposing MCP prompts as slash commands (believed true, not re-read).
- Codex's MCP support details; Cursor running Open VSX extensions.
- VS Code status bar / notification / webview signatures (standard API, not re-read this session).
- JetBrains plugin notification APIs and its AI assistant's MCP support.
- Raycast OAuth PKCE against Clerk.
- `tauri-plugin-notification` behaviour on each OS.
- GitHub REST events window (~90 days / 300 events) and the Actions API for failure streaks; Google Calendar `freeBusy`.
- RescueTime's current product.
- Bun `--compile` details (official executables page 404'd; release notes only); notarization for our binaries.
- X DM pricing ($0.015/DM, pay-per-use launch date conflicts between changelog copies); LinkedIn messaging API partner-only status.
- Discord user-installable apps details.
- Founder Pledge resource count and signatory numbers; Felicis 1% program; Brex Catharsis status; OSMI surveys after 2022.
- Headspace-in-Viva discontinuation (third-party blog, 2024); Calm's Slack absence; Unmind's mood features; Modern Health's Slack/Teams connectors; Spring Health and Lyra integrations.
- Kona's current product (it reportedly pivoted toward an AI meeting assistant).
- Teams bot registration (Azure resource) and Teams Store certification steps.
- The k-anonymity threshold and HIPAA/EAP legal questions.
- `brew autoupdate` internals.

## Sources

**Repo**
- `apps/cli/AGENTS.md`, `apps/cli/package.json`, `apps/cli/src/index.tsx`, `src/config.ts`, `src/auth/{oauth,session,token-store,file-lock,browser}.ts`
- `apps/desktop/src-tauri/Cargo.toml`, `tauri.conf.json`
- `packages/backend/convex/auth.config.ts`, `followUps.ts` (`getReadyCard`, `markReturn`, `resolveCard`), `followUpResponses.ts` (`record`)
- `docs/research/proactive-outreach-channels.md`
- `/Users/nathan/Developer/XolaceInc/sample apps/convex-slack-main/{README.md,package.json,src/client/index.ts,src/component/schema.ts}`

**MCP**
- https://modelcontextprotocol.io/specification/latest (schema 2026-07-28)
- https://modelcontextprotocol.io/specification/2026-07-28/changelog
- https://modelcontextprotocol.io/specification/2026-07-28/client/elicitation
- https://modelcontextprotocol.io/specification/2026-07-28/client (roots deprecation)
- https://modelcontextprotocol.io/extensions/apps/overview

**AI coding agents**
- https://code.claude.com/docs/en/hooks
- https://code.claude.com/docs/en/statusline
- https://code.claude.com/docs/en/channels
- https://learn.chatgpt.com/docs/hooks (redirected from developers.openai.com/codex/hooks)
- https://cursor.com/docs/hooks
- https://code.visualstudio.com/api/references/vscode-api (`lm.registerMcpServerDefinitionProvider`)
- https://developers.raycast.com/information/lifecycle/background-refresh
- https://v2.tauri.app/learn/system-tray/
- Clerk MCP: https://clerk.com/docs/expressjs/guides/ai/mcp/build-mcp-server, https://clerk.com/docs/guides/ai/mcp/connect-mcp-client, https://clerk.com/changelog/2026-08-06-client-id-metadata-documents (search results)

**Terminal and runtime**
- https://starship.rs/config/ (prompt `command_timeout`, custom module options)
- https://sw.kovidgoyal.net/kitty/desktop-notifications/
- Ghostty `desktop-notifications` (commit mirrors, third-party): https://git.uoc.run.place/Applied-Software/ghostty/commit/3f4ea2f76334d07caadbd8c6a77e567e6e292beb
- Bun: https://bun.com/blog/bun-v1.3, https://bun.sh/blog/bun-v1.4.1, https://bun.com/reference/bun/BuildConfig/compile

**Developer signals and prior art**
- https://wakatime.com/developers
- https://dev.to/wellallytech/developer-burnout-how-your-git-history-can-improve-your-well-beinga-5dib
- https://n8n.io/workflows/9517
- https://hunted.space/product/codexpulse
- https://www.osmihelp.org/research.html
- https://www.reboot.io/
- https://echai.ventures/startingup/from/founderpledge-com
- https://www.producthunt.com/products/founder-mental-health-pledge
- https://www.brex.com/catharsis
- https://rosetta.to/u/ycombinator/erin-frey-on-therapy
- https://github.com/aplomb2/CodeFit-Extension
- https://awesome.ecosyste.ms/projects/github.com%2Fhousebirdgames%2Fmindful-coding
- https://pypi.org/project/jrnl
- X API: https://docs.x.com/updates/changelog, https://opentweet.io/how-to/send-x-dms-api

**B2B**
- https://clerk.com/docs/guides/organizations/overview
- https://docs.slack.dev/ai/developing-agents
- https://docs.slack.dev/reference/methods/chat.scheduleMessage
- https://docs.slack.dev/workflows/workflow-steps
- https://docs.slack.dev/slack-marketplace/slack-marketplace-app-guidelines-and-requirements
- https://learn.microsoft.com/en-us/microsoftteams/platform/bots/how-to/conversations/send-proactive-messages
- https://support.microsoft.com/en-US/viva/insights/reflect-in-viva-insights
- https://learn.microsoft.com/en-us/viva/insights/personal/teams/viva-insights-headspace
- https://blog-en.topedia.com/2024/07/end-of-headspace-in-viva-insights/
- https://business.calm.com/integrations/, https://appsource.microsoft.com/product/office/WA200006425
- https://unmind.com/blog/unmind-for-ms-teams
- https://heykona.com/solution/employee-burnout, https://www.g2.com/products/kona/reviews
- https://www.findailist.com/tools/modern-health

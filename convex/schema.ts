import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { vWorkflowId } from "@convex-dev/workflow";
import {
  chatModerationCategoryValidator,
  conversationRoleValidator,
  insightFeatureValidator,
  intakeAnswerValidators,
  licenceValidator,
  motionPreferenceValidator,
  resourceValidator,
  safeguardLevelValidator,
  supportNeedValidator,
  triggerTypeValidator,
  talkPeakValidator,
  activityActionTypeValidator,
  domainValidator,
} from "./lib/validators";
import { voiceSlugValidator } from "./lib/voices";
import { specialtyValidator } from "./lib/specialties";

// =============================================================
// XOLACE BETA
// =============================================================
//
// This schema merges two design philosophies:
// - Privacy-first structural separation (auth identity decoupled
//   from emotional identity — a breach of one reveals nothing
//   about the other)
//
// Design principles:
// 1. The users ↔ emotional_profiles mapping is the most
//    sensitive record in the system. Treat it accordingly.
// 2. Session turns are first-class entities.
// 3. Emotional metadata lives separately from sessions so
//    it can be re-classified when models improve.
// 6. Consent is append-only. Never mutate, always audit.
// =============================================================

export default defineSchema({
  // ===========================================================
  // 1. USERS
  // ===========================================================
  //
  // The authentication shell. Deliberately thin.
  // Contains NOTHING emotional.
  users: defineTable({
    authProvider: v.union(v.literal("apple"), v.literal("google")),

    // The verified Clerk user id (identity.subject, "user_..."), set server-side
    // from the JWT — never the client. Not their email. Not their name.
    authProviderAccountId: v.string(),

    // The bridge to emotional data.
    emotionalProfileId: v.id("emotional_profiles"),

    // Canonical stable identifier from ctx.auth.getUserIdentity().
    // Format: "{issuer}|{subject}". Used for auth lookups.
    tokenIdentifier: v.string(),

    // --- Account State ---

    // Active, suspended, soft-deleted, or actively purging.
    // "deleted" means deletion has been requested — the purge
    // sweep will claim it. "purging" means the sweep has claimed
    // it and a purgeUser drain is in flight; this claim keeps the
    // sweep from re-selecting (and double-enqueuing) the same user.
    accountStatus: v.union(
      v.literal("active"),
      v.literal("suspended"),
      v.literal("deleted"),
      v.literal("purging"),
    ),

    // When the user requested account deletion.
    // Triggers the data purge pipeline.
    // Null if no deletion requested.
    deletionRequestedAt: v.optional(v.number()),

    isXolacer: v.optional(v.boolean()),

    // --- Timestamps ---
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    // Look up user by auth provider credentials.
    // Every authenticated request needs this.
    .index("by_auth_provider", ["authProvider", "authProviderAccountId"])

    // Canonical auth lookup by tokenIdentifier.
    .index("by_token", ["tokenIdentifier"])

    // Find accounts pending deletion for the purge job.
    .index("by_deletion", ["accountStatus", "deletionRequestedAt"]),

  // ===========================================================
  // 2. EMOTIONAL PROFILES
  // ===========================================================
  //
  // The pseudonymous emotional identity. Everything the
  // system "knows" about the user as a feeling human.
  //
  // Decoupled from auth so that a breach of this table
  // reveals emotional patterns but NO real-world identities.
  emotional_profiles: defineTable({
    onboardingComplete: v.boolean(),

    // MIRRORED: this field is the sort key of the `reflectionRank` aggregate
    // (convex/lib/aggregates.ts), which powers the profile percentile card.
    // Any new writer — insert, patch, or delete — must call the matching
    // rankInsert/rankReplace/rankDelete helper, or the aggregate drifts and
    // every user's percentile goes wrong with no error surfaced.
    sessionCount: v.number(),

    // Quotes the user has kept (daily_quotes.savedAt set). Maintained on
    // save/unsave like sessionCount is on session completion. Optional —
    // rows written before the archive shipped have no count; read as `?? 0`.
    savedQuoteCount: v.optional(v.number()),

    firstSessionAt: v.optional(v.number()),

    // Timestamp of most recent session.
    // Used for streak calculation, nudge timing,
    // and re-engagement logic.
    lastSessionAt: v.optional(v.number()),

    // Rolling average session duration in seconds.
    // Helps AI calibrate response length over time.
    averageSessionDuration: v.optional(v.number()),

    // --- Streak ---
    // Current run of consecutive active days. Resets after 48 hours.
    currentStreak: v.number(),

    // Longest streak ever reached. A record — it never decays, only grows
    // via Math.max on session completion. Optional for rows created before
    // this field existed; backfilled to currentStreak by migration.
    longestStreak: v.optional(v.number()),

    // Streak freezes on hand (#434): +1 per 7 consecutive qualifying days,
    // capped at FREEZE_CAP. Spent lazily by settleStreak (convex/streaks/state.ts).
    // Optional — rows predating freezes read as `?? 0`.
    streakFreezes: v.optional(v.number()),

    // Streak savers on hand (#435): +1 at each streak milestone
    // (convex/streaks/milestones.ts), capped at SAVER_CAP. Spent by an
    // explicit revive (convex/streaks/revive.ts). Optional — reads as `?? 0`.
    streakSavers: v.optional(v.number()),
    // Missed day a revive covered: streakState treats it as covered for the
    // gap check, with no activity_log or frozen_days row, so the graph still
    // shows it missed. Only the latest matters.
    streakRevivedDay: v.optional(v.string()),
    // The run recordActivity reset when a break's first action landed, kept
    // so a revive later that day can still restore it. Self-expiring: only
    // honoured within the revive window of `lastCoveredDay`.
    brokenStreak: v.optional(v.object({ streak: v.number(), lastCoveredDay: v.string() })),
    // Latest frozen_days dayKey the app has acknowledged in-app (#436), so the
    // "a freeze kept your streak lit" banner shows once per freeze event.
    freezeAckedDay: v.optional(v.string()),
    // The local Monday ("YYYY-MM-DD") of the week whose talk time was last
    // topped up (#596). Lazily, at the person's next talk-time read or start.
    talkWeekOf: v.optional(v.string()),

    // Session a free user bought Plus from at session-end's kindling upsell
    // (`paths.requestKindling`). The completion-time `generate.run` no-oped
    // on the free tier; `premium.onEntitlementActivated` re-queues it once
    // the webhook lands, then clears this. One slot — the latest wins.
    pendingKindlingSessionId: v.optional(v.id("sessions")),

    // --- Learned Patterns ---

    // Top 3-5 recurring emotion tags across sessions.
    // Updated incrementally after each session.
    // Powers faster pattern matching and context building.
    dominantEmotionTags: v.array(v.string()),

    // Top recurring words from the user's own language, by frequency.
    // Display forms are normalized (lowercased + trimmed) so "Stuck" and
    // "stuck" count as one. Recomputed after each session from a bounded
    // window. Powers the P5 words teaser (shows top 4); store ~10 to give
    // the future premium words screen headroom. Counts stay server-side —
    // never returned to the client while the feature is premium-gated.
    frequentWords: v.optional(
      v.array(v.object({ word: v.string(), count: v.number() })),
    ),

    // When the user typically processes. Learned from
    // session timestamps. Null until 5+ sessions.
    // Used for contextual nudge timing.
    typicalUsagePattern: v.optional(
      v.object({
        dayOfWeek: v.number(), // 0-6, Sunday = 0
        hourOfDay: v.number(), // 0-23
      }),
    ),

    // --- Voice Vent Usage ---
    // Rolling daily counter for ElevenLabs conversational AI minutes used.
    // Lazy-reset to 0 when ventDailyResetAt < startOfTodayUTC.
    ventDailyMinutesUsed: v.optional(v.number()),
    // UTC midnight timestamp of the last reset. Used for lazy daily reset logic.
    ventDailyResetAt: v.optional(v.number()),

    // --- Plus Dictation Usage (#558) ---
    // Seconds of Scribe dictation transcribed today; separate from vent's
    // budget. Lazy-reset to 0 when dictationDailyResetAt < startOfTodayUTC.
    dictationDailySecondsUsed: v.optional(v.number()),
    dictationDailyResetAt: v.optional(v.number()),

    // --- Data Wipe ---
    // Set to true when a data wipe is in progress.
    // Prevents duplicate wipe jobs from being scheduled.
    dataWipeInProgress: v.optional(v.boolean()),

    // runAt of the newest consolidation run whose insight set is published
    // (compounding/insightStore.endRun). An older run finishing late can't
    // write or keep rows past it. Absent until the first insight run ends.
    insightsRunAt: v.optional(v.number()),

    // --- Cognition Layer: semantic memory pointer ---
    // Current semantic profile version (row in semantic_profiles).
    // Versions are append-only; this pointer selects the live one so a
    // bad agent pass is a one-step revert. Undefined until the Reflection
    // Agent writes the first version.
    currentSemanticProfileId: v.optional(v.id("semantic_profiles")),

    // When the Reflection Agent's consolidation pass last ran. Set ONLY by
    // that pass; anchors the activity gate (≥5 sessions OR ≥7 days since this
    // point). Undefined → anchor on firstSessionAt ?? createdAt. Cleared by
    // the data-wipe pipeline alongside currentSemanticProfileId.
    lastConsolidationAt: v.optional(v.number()),

    // --- Steadiness (#535) ---
    // When each domain first left warming. Outlives the session that unlocked
    // it, so travel or retention leaving fewer days never re-locks it or
    // replays its beat. Dropped by retention once a domain has no readings;
    // cleared by the data wipe. One entry per domain at most.
    unlockedDomains: v.optional(v.array(v.object({ domain: domainValidator, at: v.number() }))),

    // --- Timestamps ---
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // One row per (profile, local day, action type), with a repeat `count`.
  // Weight is derived from `actionType` at read time (see
  // convex/lib/activityLog.ts ACTION_WEIGHTS) — never stored, so re-weighting
  // an action type doesn't require a backfill. `dayKey` is computed once, at
  // write time, from whichever IANA timezone was active then (see
  // recordActivity) — never recomputed later from a raw timestamp.
  activity_log: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),
    // Local calendar day, "YYYY-MM-DD", computed once at write time.
    dayKey: v.string(),
    actionType: activityActionTypeValidator,
    count: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_emotionalProfileId_and_dayKey_and_actionType", ["emotionalProfileId", "dayKey", "actionType"]),

  // A missed day a streak freeze bridged (#434). Never an activity_log row —
  // the log stays an honest record of showing up; this gives the contribution
  // graph its third (frozen) state. dayKey is persisted once, at settle time.
  frozen_days: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),
    dayKey: v.string(),
    createdAt: v.number(),
  }).index("by_emotionalProfileId_and_dayKey", ["emotionalProfileId", "dayKey"]),

  // ===========================================================
  // 3. PREFERENCES
  // ===========================================================
  //
  // Configuration. How the user wants the system to behave.
  // Separated from emotional_profiles because:
  // - Profiles update on session completion (system-driven)
  // - Preferences update on explicit user action (user-driven)
  // - Different access patterns, different update frequencies
  //
  // One document per emotional profile. 1:1 relationship.
  //
  preferences: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),

    // --- Display ---

    theme: v.union(v.literal("light"), v.literal("dark"), v.literal("system")),

    // Selected color palette (e.g. "default", "lavender", "mint", "sky").
    // Stored separately from light/dark mode so both can change independently.
    colorTheme: v.optional(v.string()),

    // Tri-state motion preference (system | reduced | full), resolved against
    // the OS reduce-motion flag at read time. This is the source of truth going
    // forward — undefined on rows written before it shipped.
    motionPreference: v.optional(motionPreferenceValidator),
    // DEPRECATED(remove-after: app >= min-supported-version-that-writes
    // motionPreference): back-compat boolean mirror of motionPreference. Old
    // shipped UIs still read/write this, so the mutation keeps the two fields in
    // sync. Resolver precedence: motionPreference ?? (reducedMotion ? "reduced"
    // : "system"). Delete once no store-published client references it.
    reducedMotion: v.boolean(),

    // --- Notifications ---
    // All default false. Permission requested after 3rd session.
    notifications: v.object({
      enabled: v.boolean(),
      gentleReturn: v.boolean(), // "It's been a while..."
      patternNudge: v.boolean(), // "Sunday evening..."
      milestone: v.boolean(), // "30 days of showing up"
      // Streak milestones (#439). Optional; absent follows `milestone` — see
      // `streakMilestoneAllowed` (convex/streaks/milestones.ts).
      streakMilestone: v.optional(v.boolean()),
      // Xolacer chat: requests, accepts, declines, messages. Optional because
      // every row written before it existed has to keep working, and absent
      // means enabled — see `chatNotificationsAllowed`. One toggle for the
      // whole feature; nobody wants to mute "accepted" but keep "new message".
      chat: v.optional(v.boolean()),
      // Reach preset: how the AI sounds when it reaches out.
      // Defaults to "warm" on first enable. User-adjustable in Settings.
      reach: v.optional(
        v.union(v.literal("warm"), v.literal("direct"), v.literal("quiet")),
      ),
      // Quiet Window: suppress notifications outside these local hours (0–23).
      quietWindow: v.optional(
        v.object({
          dontReachBefore: v.number(),
          dontReachAfter: v.number(),
        }),
      ),
      // IANA timezone captured client-side so the server can gate by local hour.
      timezone: v.optional(v.string()),
    }),

    // --- AI Calibration ---

    // How the mirror speaks to this user.
    // "poetic" = metaphor-rich, soft, evocative
    // "gentle" = warm, simple, nurturing
    // "direct" = clear, less flourish, gets to the point
    // "adaptive" = AI reads the room (default)
    //
    // Learned over time from confirmation patterns and
    // adjustable in settings.
    mirrorTone: v.union(
      v.literal("poetic"),
      v.literal("gentle"),
      v.literal("direct"),
      v.literal("adaptive"),
      v.literal("witnessed"),
    ),

    // Plus-only TTS voice override. Undefined = default (tone-mapped mirror
    // voice, Witnessed vent voice). Slug into VOICE_CATALOG, never a raw
    // ElevenLabs id. Premium is re-checked at generation time, so a lapsed
    // subscription silently falls back without wiping the choice.
    voice: v.optional(voiceSlugValidator),

    // --- Privacy ---

    // Pre-select "share anonymously" at session end.
    // User still sees the distilled text and can untoggle.
    contributeByDefault: v.boolean(),

    // How long to keep session data before auto-purge.
    // "indefinite" is default. Gives users explicit control.
    dataRetentionPreference: v.union(
      v.literal("indefinite"),
      v.literal("6_months"),
      v.literal("1_year"),
    ),

    // Personal memory (Cognition Layer §1.1b). On by default (undefined =
    // true). Off = new sessions embed metadata-only into episodic memory —
    // no raw text, no mirror text. Converts disclosure into agency.
    personalMemoryEnabled: v.optional(v.boolean()),

    // --- Input ---

    // Default input mode. "text" for MVP.
    // "voice" becomes available in Phase 2.
    preferredInputType: v.union(v.literal("text"), v.literal("voice")),

    // Name the user chose for their processing space. Undefined = unnamed.
    // Passed to the articulator so identity questions ("who are you / what
    // model are you") resolve to the user's chosen name rather than exposing
    // the underlying provider.
    spaceName: v.optional(v.string()),

    // Profile identity fields (added for profile screen v1).
    // displayName: warm auto-generated default (nature/light vocabulary), user-editable. Max 30 chars.
    // avatarId: key into the defined totem set. Defaults to "default". Change flow is Wave 2.
    displayName: v.optional(v.string()),
    avatarId: v.optional(v.string()),

    // True once the naming dialog has been shown and the user tapped "Not now".
    // Prevents re-prompting; settings entry is the only other path.
    spaceNamePromptDismissed: v.optional(v.boolean()),

    // Set-once signal that this user cares about register: they changed how the
    // mirror speaks, or reached for a tone they don't have. Read only at
    // pitch-selection time — it swaps a proactive Plus offer's copy variant and
    // never triggers one (#220 rule 6). Never cleared: later picking the
    // default back doesn't unlearn that they noticed.
    registerComplaint: v.optional(v.boolean()),

    // Lantern "Reading as…" (#409): audience facet slugs the reader chose.
    // Undefined = never answered (the home shows the one-time card); [] =
    // dismissed, which is an answer — For you then reads the Understanding alone.
    libraryAudiences: v.optional(v.array(v.string())),

    // Daily Quotes feature preferences.
    // Undefined until the user first visits the quotes screen.
    // Nightly cron only processes users where this is defined OR
    // they have at least 1 session in the last 30 days.
    quotes: v.optional(
      v.object({
        // 2-4 theme slugs selected during preference setup.
        themes: v.array(v.string()),
        // Whether the user opted into daily quote notifications.
        notificationEnabled: v.boolean(),
        // "morning" | "afternoon" | "evening" | "none"
        notificationTime: v.optional(v.string()),
        // IDs of curated quotes already shown — avoids repeats for 6+ months.
        shownQuoteIds: v.array(v.id("quotes")),
      }),
    ),
  })
    .index("by_profile", ["emotionalProfileId"])
    .index("by_retention", ["dataRetentionPreference"]),

  // ===========================================================
  // 3b. INTAKE RESPONSES
  // ===========================================================
  //
  // The post-signup segmentation questionnaire (T3, issue #234). One row per
  // profile, written once by `intake.complete` in the same transaction that
  // flips `emotional_profiles.onboardingComplete`.
  //
  // Named typed columns, not EAV and not a JSON blob: 11 fixed questions is
  // not a dynamic form engine, and the consumers (ai/context.ts, follow-up
  // cadence, cohort segmentation) read these as typed enums with no cast.
  //
  // Pseudonymous side — every answer is about a feeling human.
  // "prefer_not_to_say" is a real value everywhere it appears; an absent
  // field means only "the branch never fired" (the series pair below).
  //
  // Lifecycle: purged by dataWipe and accountDeletion; deliberately NOT aged
  // out by dataRetentionPreference (see CONTEXT.md, "Intake, and the two
  // onboardings").
  intake_responses: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),

    // Questionnaire revision this row was captured under. A stamp, NOT a
    // gate — bumping it never re-prompts anyone. A future re-run is a
    // considered migration that flips `onboardingComplete` back to false.
    intakeVersion: v.number(),
    completedAt: v.number(),

    // The ten answer columns (Q2–Q11). Shared with the `intake.complete`
    // mutation args so the two can never drift.
    ...intakeAnswerValidators,
  }).index("by_profile", ["emotionalProfileId"]),

  // ===========================================================
  // 4. SESSIONS
  // ===========================================================
  //
  // The atomic unit of the product. One session = one complete
  // emotional processing cycle from entry to close.
  //
  // Key design decisions:
  // - State machine tracks exactly where users are and where
  //   they drop off.
  // - rawInput stores the user's plaintext. Convex encrypts at rest;
  //   TLS encrypts in transit. No app-level encryption needed.
  // - inputDuration and freezeOccurred capture pre-articulation
  //   behavior that is emotionally meaningful signal.
  // - mirrorModelVersion tracks which AI produced this mirror,
  //   enabling quality comparison across prompt iterations.
  //
  sessions: defineTable({
    // --- Ownership ---
    emotionalProfileId: v.id("emotional_profiles"),

    // --- State Machine ---
    // Every transition is a product insight.
    // "Where do users drop off?" is answered by querying
    // the distribution of terminal states.
    state: v.union(
      v.literal("initiated"), // App opened input screen
      v.literal("input_received"), // User tapped "Let it out"
      v.literal("processing"), // Breath animation, AI working
      v.literal("mirror_delivered"), // Mirror shown, awaiting response
      v.literal("confirmed"), // User tapped "That's it"
      v.literal("path_selected"), // User chose a path
      v.literal("path_in_progress"), // Doing exercise / viewing reflections
      v.literal("completed"), // Session fully closed
      v.literal("abandoned"), // User left before completing
      v.literal("error"), // AI processing failed, user can retry
    ),

    // --- Input ---

    // How the user entered. "open_prompt" = free text (MVP).
    // Future: "body_scan", "word_cloud", "voice".
    // Tracked from day one so adding entry modes doesn't
    // require schema migration.
    entryType: v.union(
      v.literal("open_prompt"),
      v.literal("guided_entry"),
      v.literal("body_scan"),
      v.literal("word_cloud"),
      v.literal("voice"),
      v.literal("talk"), // A companion talk (#592): rawInput is the person's lines only
    ),

    // The user's raw text. Optional: not set until input_received state.
    rawInput: v.optional(v.string()),

    // Character count of the raw input. Useful for analysis
    // without decrypting content.
    // Optional: not set until input_received state.
    rawInputLength: v.optional(v.number()),

    // Milliseconds from first keystroke to "Let it out" tap.
    // Emotionally meaningful: someone who types 200 words in
    // 30 seconds is flooding. Someone who takes 5 minutes is
    // deliberating. The AI can use this to calibrate energy.
    inputDuration: v.optional(v.number()),

    // Did the user sit on the entry screen for 30+ seconds
    // without typing? Pre-articulation difficulty is itself
    // a signal worth tracking.
    // Optional: not set until input_received state.
    freezeOccurred: v.optional(v.boolean()),

    // How long they froze, in milliseconds. Only populated
    // if freezeOccurred is true.
    freezeDuration: v.optional(v.number()),

    // --- Mirror ---

    // The AI's articulation. 1-3 sentences.
    // Optional: not set until mirror_delivered state.
    mirrorText: v.optional(v.string()),

    // Which version of the articulation engine produced this.
    // Format: "articulator-v{N}-{model}", e.g. "articulator-v2-sonnet-5.5" (ARTICULATOR_VERSION)
    // Critical for tracking quality across prompt iterations.
    // Optional: not set until mirror_delivered state.
    mirrorModelVersion: v.optional(v.string()),

    // Tone used to generate this session's mirror.
    // Optional for historical sessions created before this field existed.
    toneUsed: v.optional(
      v.union(
        v.literal("poetic"),
        v.literal("gentle"),
        v.literal("direct"),
        v.literal("adaptive"),
        v.literal("witnessed"),
      ),
    ),

    // Convex file storage ID for the ElevenLabs TTS audio of the mirror text.
    // Generated async after mirror delivery; null until ready.
    mirrorAudioStorageId: v.optional(v.id("_storage")),

    // What happened after the mirror was shown.
    // Optional: not set until confirmed/abandoned.
    confirmationState: v.optional(
      v.union(
        v.literal("confirmed"), // "That's it" on first try
        v.literal("refined"), // Confirmed after 1-2 "Not quite" loops
        v.literal("gave_up"), // AI couldn't get it right, user proceeded anyway
        v.literal("abandoned"), // User left during mirror stage
      ),
    ),

    // --- Path ---

    pathChosen: v.optional(
      v.union(
        v.literal("solo"), // Sit with this
        v.literal("peers"), // You're not alone
        v.literal("exit"), // I just needed to say it
      ),
    ),

    // Whether they finished the chosen path.
    pathCompleted: v.optional(v.boolean()),

    // If "solo" — which exercise was selected.
    exerciseId: v.optional(v.id("exercises")),

    // Which exercise the matcher picked at mirror time.
    matchedExerciseId: v.optional(v.id("exercises")),

    // Exercises swapped into during the session (append-only, bounded ≤2).
    swappedExerciseIds: v.optional(v.array(v.id("exercises"))),

    // Claude-filled slot values for the matched exercise (e.g. user_phrase).
    exerciseSlots: v.optional(v.record(v.string(), v.string())),

    // If "peers" — did they contribute their reflection.
    contributedReflection: v.optional(v.boolean()),

    // AI-distilled first-person anonymous reflection.
    // Generated speculatively after mirror delivery.
    // Shown to user at contribution prompt for consent.
    distilledText: v.optional(v.string()),

    // --- Burn / Keep ---
    // Whether the user chose to keep this session in the system.
    // undefined → Mirror session (always kept until toggle ships).
    // false → ephemeral / vent-originated → distiller/anonymizer skip it.
    kept: v.optional(v.boolean()),

    // --- Post-Session Mood ---

    // How the user feels after the session.
    // Optional: only set if the user engages with the mood check.
    postSessionMood: v.optional(
      v.union(
        v.literal("lighter"),
        v.literal("same"),
        v.literal("heavier"),
        v.literal("unsure"),
      ),
    ),

    // --- Unlock moment (#523) ---

    // The domains this session's reading moved out of warming, stamped at
    // completion. `first`: nothing was unlocked before it. `seenAt`: the
    // session-end beat showed; unset next day → one generic push. Lives and
    // dies with the session, so retention and wipe carry it.
    domainUnlock: v.optional(
      v.object({
        domains: v.array(domainValidator),
        first: v.boolean(),
        seenAt: v.optional(v.number()),
      }),
    ),

    // --- Safety ---

    // Whether this session triggered escalation.
    // Optional: not set until AI processing completes.
    escalationTriggered: v.optional(v.boolean()),

    // Structured resources delivered alongside the escalation mirror.
    // Passed from safeguard engine through deliverMirror so the client
    // has them in a single subscription with zero extra queries.
    escalationResources: v.optional(v.array(resourceValidator)),

    // --- Temporal Context ---
    // Stored explicitly for fast pattern queries without
    // needing to compute from timestamps every time.

    // Optional: set when input is submitted.
    timeOfDay: v.optional(
      v.union(
        v.literal("early_morning"), // 5am-8am
        v.literal("morning"), // 8am-12pm
        v.literal("afternoon"), // 12pm-5pm
        v.literal("evening"), // 5pm-9pm
        v.literal("late_night"), // 9pm-5am
      ),
    ),

    // Optional: set when input is submitted.
    dayOfWeek: v.optional(v.number()), // 0-6, Sunday = 0

    // Dynamic prompt shown, if different from default.
    // Null = "What's here right now?"
    customPrompt: v.optional(v.string()),

    // Whether this session started during the "night mode" window (10pm–4am).
    // Captured at session start; copy and theme stay locked to this mode
    // for the full session regardless of clock changes mid-session.
    sessionMode: v.optional(v.union(v.literal("day"), v.literal("night"))),

    // The Library entry this session was opened from ("Reflect on this", #413).
    fromEntryId: v.optional(v.id("library_entries")),

    // --- Duration ---

    // Total session time in milliseconds.
    sessionDuration: v.optional(v.number()),

    // Error message when state is "error" (AI processing failure).
    errorMessage: v.optional(v.string()),

    // What the pipeline is doing while state is "processing", so the waiting
    // copy is literally true (rule 12). Absent = still reading the input;
    // "connecting" = writing with an episodic memory at/above
    // EPISODIC_CONNECT_FLOOR. Cleared on every transition into "processing".
    processingStage: v.optional(
      v.union(v.literal("writing"), v.literal("connecting")),
    ),

    // --- Follow-Up System ---

    // Safeguard level computed at mirror delivery. Persisted so the follow-up
    // cadence can distinguish crisis (→ Acute tier) from elevated. Stored for
    // all sessions, not just escalations.
    safeguardLevel: v.optional(
      v.union(
        v.literal("none"),
        v.literal("gentle"),
        v.literal("elevated"),
        v.literal("crisis"),
      ),
    ),

    // Was a follow-up warranted for this session? Set at completion from
    // the preliminary AI/escalation flag (deliverMirror) combined with
    // gave_up. Drives the profile Follow-Ups section and the workflow gate.
    requiresFollowUp: v.optional(v.boolean()),

    // Workflow ID returned by workflow.start(). Stored here so:
    // (1) markReturn can target the right workflow on app open
    // (2) the workflow can be cancelled early (return / supersede / wipe).
    // Uses the component's branded WorkflowId validator, not v.string().
    followUpWorkflowId: v.optional(vWorkflowId),

    // --- Confidence-aware mirroring ---
    // A reach went out on this session: the mirror said plainly that what the
    // feeling attaches to was not in the words yet. Session-scoped, and the
    // source of the per-profile same-day guard (one reach per calendar day).
    // Named gapNamed, not reach*, so it never collides with the notification
    // Reach (notification_log.reachUsed) — see CONTEXT.md.
    gapNamed: v.optional(v.boolean()),

    // --- Semantic matching (Xolace+) ---
    // Precomputed peer-reflection ids from RAG vector search, written by
    // computeSemanticMatches for premium users when the peers path is chosen.
    // matchForSession returns these when present; otherwise it falls back to
    // the tag-based cascade (also the graceful path if the embed action failed).
    semanticMatchIds: v.optional(v.array(v.id("reflections"))),

    // --- Talk (entryType "talk", #592) ---
    // Random per-talk secret, handed only to the person who started it. The
    // Custom LLM endpoint serves a turn only when ElevenLabs relays it back
    // with the sessionId (via the extra body), binding the talk to this session.
    talkKey: v.optional(v.string()),
    // Reported by the client once connected; the webhook DELETEs it (#595).
    elevenLabsConversationId: v.optional(v.string()),
    // When ElevenLabs confirmed their copy deleted (webhook or sweeper, #595).
    providerDeletedAt: v.optional(v.number()),
    // What the companion knows of the person, rendered once at talk start
    // (#598): the cached prompt prefix. Cleared when the talk closes.
    talkMemory: v.optional(v.string()),
    // Episodic recall during a talk (#598): the latest hits, read by the next
    // turn, and every memory key surfaced so far. Absent with memory off.
    talkRecall: v.optional(
      v.object({ lines: v.array(v.string()), surfaced: v.array(v.string()) }),
    ),
    // Safety during the talk (#599): the highest level it reached, never
    // lowered. Read each turn (safety skill, help on screen) and by
    // generateMirror (session level = max of this and the end verdict).
    talkSafety: v.optional(talkPeakValidator),
    // The fixed crisis line was spoken: it is said once per talk.
    talkCrisisLineSpoken: v.optional(v.boolean()),
    // The companion's name for this talk (#601): spaceName at start, or a
    // rename mid-talk. Kept: the talk's mirror says who it was with.
    companionName: v.optional(v.string()),

    // --- Timestamps ---
    createdAt: v.number(), // Session initiated
    completedAt: v.optional(v.number()), // Session closed
    updatedAt: v.number(), // Last state transition
  })
    // Timeline screen: user's sessions, newest first.
    .index("by_profile_time", ["emotionalProfileId", "createdAt"])

    // Dropout analysis: where do sessions end?
    .index("by_profile_state", ["emotionalProfileId", "state"])

    // Safety monitoring: flagged sessions.
    .index("by_escalation", ["escalationTriggered", "createdAt"])

    // Aggregate analytics.
    .index("by_date", ["createdAt"])

    // Abandoned-session sweep: stale sessions in a given non-terminal state.
    .index("by_state_and_updatedAt", ["state", "updatedAt"])

    // Model quality tracking: compare confirmation rates across versions.
    .index("by_model_version", ["mirrorModelVersion", "confirmationState"])

    // Same-day reach guard: "has this profile reached today" in one read.
    .index("by_profile_gapNamed", [
      "emotionalProfileId",
      "gapNamed",
      "createdAt",
    ])

    // Abandoned-session sweep: talks that ended with nothing to mirror
    // (no rawInput) are removed with their transcript (#588).
    .index("by_entryType_and_state_and_rawInputLength", [
      "entryType",
      "state",
      "rawInputLength",
    ])

    // Talks whose ElevenLabs copy isn't deleted yet (#595): unstamped, with a
    // conversation id. Also the webhook's lookup by conversation id.
    .index("by_providerDeletedAt_and_elevenLabsConversationId", [
      "providerDeletedAt",
      "elevenLabsConversationId",
    ]),

  // Both sides of a companion talk, one row per line, as the Custom LLM
  // endpoint served it (#588). The only lasting copy; same lifetime as its
  // session (SESSION_CASCADE_TABLES). The session's rawInput is built from
  // the person's lines at the end.
  talk_turns: defineTable({
    sessionId: v.id("sessions"),
    seq: v.number(), // 0-based position in the talk
    role: v.union(v.literal("person"), v.literal("companion")),
    text: v.string(),
    // The companion's reply as we served it, until ElevenLabs' next resend
    // of the history (what was actually spoken) replaces it. Stays when the
    // talk ends on it.
    provisional: v.optional(v.boolean()),
  }).index("by_session_and_seq", ["sessionId", "seq"]),

  // A talk's open reservation of talk time (#596): reserved at start, gone
  // once the post-call webhook settles it or the sweeper releases it. The
  // ledger itself lives in the credits component (convex/talk/time.ts).
  talk_charges: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),
    sessionId: v.id("sessions"),
    chargeId: v.string(),
    reserved: v.number(), // seconds
    startedAt: v.number(),
  })
    .index("by_emotionalProfileId", ["emotionalProfileId"])
    .index("by_sessionId", ["sessionId"])
    .index("by_startedAt", ["startedAt"]),

  // ===========================================================
  // 5. SESSION TURNS
  // ===========================================================
  //
  // Each refinement loop within a session. When the user says
  // "Not quite" and the AI tries again, that's a turn.
  //
  // Stored separately because:
  // 1. A session can have 0-2 turns.
  // 2. Each turn has its own analytical value.
  // 3. The delta between turn 1 and the final confirmed mirror
  //    is the purest signal for improving the AI.
  //
  session_turns: defineTable({
    sessionId: v.id("sessions"),

    // Sequential order within the session (1, 2).
    turnNumber: v.number(),

    // What the user indicated.
    userFeedback: v.union(
      v.literal("not_quite"), // Mirror didn't land
      v.literal("say_more"), // User wants to add more input
    ),

    // Additional text the user provided to guide the AI.
    // For "not_quite": "It's more like frustration than anger"
    // For "say_more": the additional raw input.
    userInput: v.optional(v.string()),

    // The AI's revised mirror after this feedback.
    revisedMirrorText: v.string(),

    // Which model version produced this revision.
    modelVersion: v.string(),

    createdAt: v.number(),
  })
    // Reconstruct the full refinement history for a session.
    .index("by_session", ["sessionId", "turnNumber"]),

  // ===========================================================
  // 6. EMOTIONAL METADATA
  // ===========================================================
  //
  // The AI's structured interpretation of a session.
  // Stored as its own entity so it can be:
  // - Queried independently (pattern analysis)
  // - Re-versioned when classifiers improve
  // - Aggregated without touching session content
  //
  // One metadata record per session. 1:1 relationship.
  //
  emotional_metadata: defineTable({
    sessionId: v.id("sessions"),

    // Denormalized for faster pattern queries.
    // Avoids joining through sessions to get to the profile.
    emotionalProfileId: v.id("emotional_profiles"),

    // Which classifier version produced this interpretation.
    // Enables re-classification when models improve —
    // create a new metadata record with the new version,
    // compare against the old one.
    classifierVersion: v.string(),

    // --- Emotion Classification ---

    // Broad primary emotion.
    // Using strings, not enums — vocabulary grows with the product.
    // Examples: "anger", "sadness", "anxiety", "joy", "confusion", "numbness"
    primaryEmotion: v.string(),

    // 0.0-1.0. How confident the classifier is.
    // Below 0.6 = treat as ambiguous (the ambiguity itself
    // is meaningful data for REFLECT).
    primaryEmotionConfidence: v.number(),

    // More nuanced label within the broad category.
    // "frustration" under "anger", "grief" under "sadness",
    // "overwhelm" under "anxiety".
    // Optional — only populated when confidence is sufficient.
    granularLabel: v.optional(v.string()),

    // Secondary emotion, if present.
    // "angry but underneath that, scared"
    secondaryEmotion: v.optional(v.string()),

    // --- Dimensions ---

    // 1-10. How intense is this feeling?
    intensity: v.number(),

    // 1-10. How specific vs vague is the expression?
    // 1 = "I feel bad". 10 = "I'm furious at my mother
    // for making my graduation about her boyfriend."
    specificity: v.number(),

    // --- Contextual Tags ---

    // Life domain tags inferred from content.
    // Examples: "work", "relationships", "family", "identity",
    //           "health", "finances", "purpose", "self-worth"
    thematicTags: v.array(v.string()),

    // The user's own emotional words preserved as tags.
    // "stuck", "glass wall", "drowning", "invisible".
    // Powers the REFLECT insight: "You keep coming back
    // to the word 'trapped.'"
    // Extracted by the classifier from the raw input.
    // 2-5 key words/phrases per session.
    userLanguageTags: v.array(v.string()),

    // --- Temporal Orientation ---
    // Whether the expression is about past, present, or future.
    // Null if unclear.
    temporalContext: v.optional(
      v.union(
        v.literal("past_focused"),
        v.literal("present_focused"),
        v.literal("future_focused"),
      ),
    ),

    // --- Safety ---
    riskFlag: v.boolean(),

    // --- Understanding (Cognition Layer Phase 2) ---
    //
    // This table IS the per-session Understanding object: everything the
    // system concluded about one moment, produced exactly once by the
    // pipeline, then effectively frozen. Read only via
    // understanding.getUnderstanding — no feature may call an LLM to
    // re-derive what these fields already know.

    // Full safeguard verdict at mirror time (rule-code, never model).
    // Previously scattered across sessions/escalation_events; recorded
    // here so the Understanding is complete in one row.
    safeguardLevel: v.optional(safeguardLevelValidator),
    safeguardTrigger: v.optional(triggerTypeValidator),

    // Kindling trigger (docs/paths-v1.md §1). Graded by the classifier on
    // the same call — never a second model call (Constitution Rule).
    // Optional for rollout: absent (pre-bump rows) reads as "none" at every
    // consumer, no backfill. Forced to "none" server-side whenever
    // safeguard escalates (crisis/elevated), regardless of prompt output.
    supportNeed: v.optional(supportNeedValidator),

    // RAG keys (= sessionIds) of the episodic memories that informed this
    // mirror. Required by the Phase 4 relevance loop (confirmed mirrors
    // bump these memories' importance; "not quite" decays them).
    episodicMatchKeys: v.optional(v.array(v.string())),

    // Highest episodic search score that informed this mirror, exactly as
    // returned by @convex-dev/rag (never recomputed or normalised). Absent =
    // no search ran (cold start) or nothing retrieved — never coalesce it to
    // zero, which would put a false spike into the calibration distribution.
    // Read-time input to claim strength; stored as a number, not a verdict,
    // so EPISODIC_CONNECT_FLOOR stays retroactively tunable without a backfill.
    episodicTopScore: v.optional(v.number()),

    // primaryEmotionConfidence from the FIRST classification of this session.
    // Stamped by the refinement mutation only when absent, so its presence is
    // itself the record that this session was refined (§5.3) — the row holds
    // the final read, and this is the only trace of where that read started.
    initialConfidence: v.optional(v.number()),

    // Phase 4, Loop #3 — memory relevance feedback. The running salience
    // weight (0.2–1) for THIS session AS an episodic memory, and the source
    // of truth mirrored into the RAG vector's native `importance`. When a
    // LATER session's mirror lands with this one in its episodicMatchKeys,
    // this weight is bumped; when that mirror is given up on, it decays.
    // Undefined = never adjusted = the default weight of 1. Stored here
    // (not just in the vector) because @convex-dev/rag has no in-place
    // importance setter — every change re-embeds, so we need a cheap,
    // transactional source of truth that survives re-ingestion.
    episodicImportance: v.optional(v.number()),

    // Which semantic profile version was in the articulator's context.
    // Enables "confirmation rate dropped after profile v14" attribution
    // and reconstructing exactly what the system believed at this moment.
    profileVersion: v.optional(v.number()),

    // --- Follow-Up ---
    // Brief internal sentence explaining why the classifier flagged this
    // session for a follow-up. Never shown to the user — debugging + prompt
    // tuning only. Co-located here with all other classifier output.
    // null/undefined when the classifier did not request a follow-up.
    followUpReason: v.optional(v.string()),

    // --- Session-suggested xolacer ---
    // What a peer listener would be offered for at session end, decided once
    // by the pipeline (see lib/xolacerSuggestion.ts) and absent when no
    // suggestion applies. The *only* stored artifact of the feature: the
    // person is chosen live at read time, so no session→xolacer link is ever
    // written. Doubles as the cooldown record — its presence is what says a
    // suggestion happened, which is why no timestamp field exists.
    suggestedSpecialty: v.optional(specialtyValidator),

    // --- Timestamps ---
    createdAt: v.number(),

    // If this record was re-processed by an updated classifier.
    reclassifiedAt: v.optional(v.number()),
  })
    // Pattern queries: "how often does this user feel X?"
    .index("by_profile_emotion", ["emotionalProfileId", "primaryEmotion"])

    // Theme analysis: "which life domains keep appearing?"
    .index("by_profile_theme", ["emotionalProfileId"])

    // Week-bounded range scans: intensity chart paging (current + earlier weeks).
    .index("by_profile_createdAt", ["emotionalProfileId", "createdAt"])

    // Model quality: compare classification accuracy across versions.
    .index("by_classifier_version", ["classifierVersion"])

    // Find sessions flagged as risky.
    .index("by_risk", ["riskFlag", "createdAt"])

    // Lookup by session (1:1).
    .index("by_session", ["sessionId"])

    // Cross-user week window scan for the weekly cohort aggregate
    // (jobs/cohortCounts.ts). The only index here not scoped to one profile.
    .index("by_createdAt", ["createdAt"]),

  // ===========================================================
  // 7. REFLECTIONS
  // ===========================================================
  //
  // The anonymized peer reflection pool.
  //
  // CRITICAL: NO reference to users, profiles, or sessions.
  // When a user contributes a reflection, the link is severed
  // at creation time. This is structural, not policy. Even
  // with full database access, you cannot trace a reflection
  // back to its author.
  //
  // The content is AI-distilled — not raw user text.
  // The AI rewrites to capture emotional essence while
  // stripping identifying details.
  //
  reflections: defineTable({
    // The AI-distilled reflection text.
    // Written by the articulation engine to capture emotional
    // essence without identifying details. 1-3 sentences.
    displayText: v.string(),

    // --- Matching Fingerprint ---

    // Broad emotion for primary matching.
    primaryEmotion: v.string(),

    // Nuanced label for precision matching.
    granularLabel: v.optional(v.string()),

    // Life domain tags for contextual matching.
    thematicTags: v.array(v.string()),

    // Intensity from the source session's classification.
    intensity: v.number(),

    // --- Quality & Ranking ---

    // How many users tapped "I feel this too."
    // Higher = shown more often = organic quality ranking.
    resonanceCount: v.number(),

    // --- Moderation ---

    status: v.union(
      v.literal("active"), // Visible in the pool
      v.literal("flagged"), // Pulled for review
      v.literal("removed"), // Permanently removed
    ),

    // Whether this was part of the manually curated launch pool.
    isSeed: v.boolean(),

    // Deliberately imprecise — rounded to nearest day
    // to prevent timing-based de-anonymization.
    addedAt: v.number(),
  })
    // Primary matching: find reflections for a given emotion.
    .index("by_emotion", ["primaryEmotion", "status"])

    // Precision matching with granular labels.
    .index("by_granular", ["granularLabel", "status"])

    // Quality ranking: most resonant reflections first.
    .index("by_resonance", ["status", "resonanceCount"])

    // Moderation queue.
    .index("by_status", ["status", "addedAt"])

    // Seed-dedup lookup: "does this curated seed reflection already exist?"
    .index("by_seed_displayText", ["isSeed", "displayText"]),

  // ===========================================================
  // 7b. REFLECTION RESONANCES
  // ===========================================================
  //
  // Junction table for deduplicating "I feel this too" taps.
  // One record per (profile, reflection) pair.
  // Enables true toggle (insert/delete) and prevents inflated
  // counts from reinstalls or remounts.
  //
  reflection_resonances: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),
    reflectionId: v.id("reflections"),
    createdAt: v.number(),
  })
    .index("by_profile_reflection", ["emotionalProfileId", "reflectionId"])
    .index("by_reflection", ["reflectionId"]),

  // ===========================================================
  // 8. EXERCISES
  // ===========================================================
  //
  // Micro-exercise library. Authored content, not user-generated.
  // Seeded with 15-20 exercises at launch. No CMS needed.
  //
  exercises: defineTable({
    // Internal title for admin/debugging.
    title: v.string(),

    // Exercise type — determines rendering in the app.
    type: v.union(
      v.literal("breathing"),
      v.literal("body_scan"),
      v.literal("grounding"),
      v.literal("self_compassion"),
      v.literal("cognitive_reframe"),
      v.literal("visualization"),
      v.literal("journaling_prompt"),
    ),

    // Which emotions this exercise is suited for.
    targetEmotions: v.array(v.string()),

    // Intensity range where this exercise is appropriate.
    // High-intensity panic needs different grounding than
    // low-level unease.
    intensityRange: v.object({
      min: v.number(),
      max: v.number(),
    }),

    // Ordered steps.
    steps: v.array(
      v.object({
        order: v.number(),
        content: v.string(),
        defaultContent: v.optional(v.string()),
        durationSeconds: v.optional(v.number()),
        type: v.union(
          v.literal("text"),
          v.literal("timer"),
          v.literal("prompt"),
          v.literal("breath"),
          v.literal("haptic"),
          v.literal("private_prompt"),
        ),
        breathPattern: v.optional(
          v.union(
            v.literal("physiological_sigh"),
            v.literal("extended_exhale"),
            v.literal("slow_exhale"),
          ),
        ),
        breathCycles: v.optional(v.number()),
        hapticIntensity: v.optional(
          v.union(v.literal("light"), v.literal("medium"), v.literal("heavy")),
        ),
        slotKeys: v.optional(v.array(v.string())),
        promptPlaceholder: v.optional(v.string()),
        promptMaxSeconds: v.optional(v.number()),
        syncToBreath: v.optional(v.boolean()),
      }),
    ),

    // Estimated total duration in minutes.
    estimatedMinutes: v.number(),

    // Whether this exercise is currently available.
    active: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["active"])
    .index("by_title", ["title"]),

  // ===========================================================
  // 9. ESCALATION EVENTS
  // ===========================================================
  //
  // When the AI detects signals suggesting clinical-level need.
  // The most safety-critical entity in the system.
  //
  // IMPORTANT: Escalation events are NEVER deleted, even if
  // the user deletes their account. They are retained in
  // anonymized form (emotionalProfileId stripped) for safety
  // auditing. This exception MUST be disclosed in the privacy
  // policy and consent flow.
  //
  escalation_events: defineTable({
    // Optional: stripped during account deletion anonymization.
    emotionalProfileId: v.optional(v.id("emotional_profiles")),
    sessionId: v.id("sessions"),

    // What triggered the escalation.
    triggerType: v.union(
      v.literal("explicit_crisis_language"), // Direct self-harm references
      v.literal("implicit_risk_language"), // "I can't do this anymore" in context
      v.literal("pattern_escalation"), // Cumulative intensity trend across sessions
      v.literal("crisis_keywords"), // Keyword/phrase match
      v.literal("user_requested"), // User asked for help directly
    ),

    // 0.0-1.0. AI's confidence in the risk assessment.
    triggerConfidence: v.number(),

    // Brief factual description of what triggered the flag.
    // NOT the raw text — a clinical-style summary.
    // POLICY: Stores ONLY model confidence categories and trigger
    // type descriptions. NEVER paraphrased user language.
    triggerEvidence: v.string(),

    // What the system did.
    actionTaken: v.union(
      v.literal("resources_shown"), // Showed support resources
      v.literal("warm_handoff_offered"), // Offered to connect to help
      v.literal("crisis_line_presented"), // Presented crisis hotline
      v.literal("session_redirected"), // Redirected session flow
    ),

    // How the user responded to the escalation.
    userResponse: v.optional(
      v.union(
        v.literal("engaged"), // Interacted with resources
        v.literal("dismissed"), // Closed/skipped
        v.literal("no_response"), // Didn't interact
      ),
    ),

    // Which specific resources were presented.
    // Accepts both legacy string entries and structured Resource objects.
    resourcesPresented: v.array(v.union(v.string(), resourceValidator)),

    // --- Human Review ---
    // For safety team oversight.
    reviewedByHuman: v.boolean(),
    reviewerNotes: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),

    createdAt: v.number(),
  })
    // Safety review: full escalation history for a user.
    .index("by_profile", ["emotionalProfileId", "createdAt"])

    // Lookup all events for a session.
    .index("by_session", ["sessionId"])

    // Unreviewed events queue.
    .index("by_review_status", ["reviewedByHuman", "createdAt"])

    // By trigger type for systemic analysis.
    .index("by_trigger_type", ["triggerType", "createdAt"]),

  // ===========================================================
  // 10. NOTIFICATION LOG
  // ===========================================================
  //
  // Tracks every notification sent.
  // - Don't spam: check before sending.
  // - Analytics: which types drive re-engagement?
  //
  notification_log: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),

    type: v.union(
      v.literal("gentle_return"), // "It's been a while..."
      v.literal("pattern_nudge"), // "Sunday evening..."
      v.literal("milestone"), // "30 days of showing up"
      v.literal("affirmation"), // "Being tired doesn't mean you're failing."
      v.literal("follow_up"), // Follow-up nudge for a specific unresolved session.
      // Kindling is ready (docs/paths-v1.md §10). Deliberately not a
      // `reachUsed` value — kindling is its own notification type, not a
      // Reach variant, and always sends in one voice.
      v.literal("kindling_ready"),
      // Streak hit 7/30/100/every 100 (#439). Template copy, own rate bucket.
      v.literal("streak_milestone"),
      // A domain unlocked and the beat went unseen (#523). Generic text,
      // never the domain; own weekly bucket.
      v.literal("domain_unlock"),
    ),

    // AI-generated, contextual notification text.
    content: v.string(),

    // Why the AI decided to nudge now.
    // Internal, for model evaluation.
    triggerReason: v.string(),

    // Delivery status.
    delivered: v.boolean(),

    // Did the user open the app within 24 hours?
    resultedInSession: v.optional(v.boolean()),

    // If suppressed before delivery, why.
    suppressedReason: v.optional(
      v.union(
        v.literal("rate_limit"), // Too many recent nudges
        v.literal("user_inactive"), // User hasn't opened app in 30+ days
        v.literal("escalation_active"), // Active escalation event, don't nudge
      ),
    ),

    scheduledFor: v.number(),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),

    // Which Reach variant produced this notification.
    reachUsed: v.optional(
      v.union(v.literal("warm"), v.literal("direct"), v.literal("quiet")),
    ),

    // Whether session/pattern data was available at generation time.
    patternContextUsed: v.optional(v.boolean()),

    // How the content was produced (for debugging + future analytics).
    generatedBy: v.optional(
      v.union(
        v.literal("haiku_personalized"),
        v.literal("template_cold_start"),
        v.literal("template_fallback"),
      ),
    ),

    // Feedback-loop answer from the "What landed?" card.
    landed: v.optional(
      v.union(
        v.literal("felt_right"),
        v.literal("too_much"),
        v.literal("not_enough"),
      ),
    ),
  })
    // Check: have we already nudged this user recently?
    .index("by_profile", ["emotionalProfileId", "sentAt"])

    // Analytics: which notification types work?
    .index("by_type", ["type", "resultedInSession"])

    // Delivery queue: what needs to be sent?
    .index("by_schedule", ["delivered", "scheduledFor"])

    // Per-user Reach effectiveness queries (Phase 2 learning layer).
    .index("by_profile_and_reach", ["emotionalProfileId", "reachUsed"]),

  // ===========================================================
  // 10b. PUSH DEVICES
  // ===========================================================
  //
  // One row per device holding a live Expo token for a profile.
  //
  // The push component stores exactly one token per recipient key, so keying
  // it by profile id made the last device to register replace every other. The
  // registry exists so each device gets its own recipient key (this
  // row's id) and dispatch can fan out to all of them.
  //
  // The Expo token is the device key — it is already stable per device,
  // so no generated device id is stored. `by_token` is what enforces single
  // ownership: registering a token held by another profile evicts the prior
  // holder, so a reinstalled or handed-down device cannot inherit someone
  // else's notifications.
  //
  // No `platform` field (sound and channel id are chosen per notification type
  // and both are always sent) and no `timezone` field (quiet windows are
  // evaluated at the trigger, profile-globally, never per device).
  //
  // Rows die two ways, both in `convex/lib/pushDevices.ts`: the component
  // reports `unable_to_deliver` for the recipient (five consecutive Expo
  // rejections — Expo's receipts are unreachable behind the component, see
  // docs/adr/0001-no-expo-receipts.md), or `lastRegisteredAt` passes 180 days.
  // The clock is what reaps a rotation orphan, which is never sent to
  // successfully but is never sent to at all either.
  //
  push_devices: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),
    expoPushToken: v.string(),
    lastRegisteredAt: v.number(),
    // Last time this device's component notification history was seen in a
    // prunable shape, and what that shape was. The component stores no
    // per-state timestamp, so an unchanged fingerprint across the settle window
    // is the only evidence that nothing is still writing to those rows — see
    // `decidePushHistoryPrune`.
    historyWatch: v.optional(
      v.object({ since: v.number(), fingerprint: v.string() }),
    ),
  })
    // Fan-out: every device for a profile, most recently registered
    // first. The ordering matters because token rotation leaves orphan rows
    // behind (see above) — read descending and the bounded read can never
    // return only orphans while the live device sits outside the window.
    .index("by_profile", ["emotionalProfileId", "lastRegisteredAt"])
    // Single ownership: who currently holds this token.
    .index("by_token", ["expoPushToken"]),

  // ===========================================================
  // 11. REFLECTION REPORTS
  // ===========================================================
  //
  // User-submitted reports for offensive or harmful content
  // in the peer reflection pool. Required by App Store
  // Guideline 1.2 (UGC moderation mechanism).
  //
  // Auto-flag heuristic: ≥3 reports flips reflection.status
  // to "flagged", which removes it from all active indexes.
  //
  reflection_reports: defineTable({
    reflectionId: v.id("reflections"),
    reporterProfileId: v.id("emotional_profiles"),
    reason: v.union(
      v.literal("offensive"),
      v.literal("self_harm"),
      v.literal("spam"),
      v.literal("other"),
    ),
    createdAt: v.number(),
  })
    .index("by_reflection", ["reflectionId"])
    .index("by_profile_reflection", ["reporterProfileId", "reflectionId"]),

  // ===========================================================
  // 12. FEEDBACK
  // ===========================================================
  //
  // User feedback tied to emotional profile.
  // Five types: general (settings), mood_heavier (session end),
  // mood_unsure (session end), mirror_miss (clarify state), gave_up (gave-up state).
  //
  feedback: defineTable({
    // Optional ONLY because account deletion anonymizes in place: the owner
    // link and `text` are stripped, the structural signal (type,
    // selectedOption, turnIndex) is retained. Always set on insert.
    emotionalProfileId: v.optional(v.id("emotional_profiles")),
    type: v.union(
      v.literal("general"),
      v.literal("mood_heavier"),
      v.literal("mood_unsure"),
      v.literal("mirror_miss"),
      v.literal("gave_up"),
    ),
    // Required for mirror_miss and gave_up. Optional for general and mood_heavier.
    sessionId: v.optional(v.id("sessions")),
    // mirror_miss only: 0 = first clarify attempt, 1 = second (final).
    // Range: 0..MAX_TURNS-1
    turnIndex: v.optional(v.number()),
    // general: max 1000 chars; mood_heavier/mood_unsure: max 300 chars; mirror_miss: max 100 chars
    text: v.optional(v.string()),
    // gave_up: "mirror_kept_missing" | "figured_it_out" | "needed_to_vent"
    // mood_heavier: "mirror_missed" | "life_is_heavy" | "something_else"
    // mood_unsure: "felt_ok_while_here" | "still_processing" | "too_many_things" | "something_else"
    // mirror_miss: "wrong_emotion" | "too_surface_level" | "close_but_not_quite" | "missed_the_main_thing"
    selectedOption: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_profile", ["emotionalProfileId"])
    .index("by_profile_and_created", ["emotionalProfileId", "createdAt"])
    .index("by_profile_and_type_and_created", [
      "emotionalProfileId",
      "type",
      "createdAt",
    ]),

  // ===========================================================
  // 13. QUOTES LIBRARY
  // ===========================================================
  //
  // Curated quote library. Authored content, not user-generated.
  // 180+ quotes at launch. Themed with 1-2 slugs each.
  // Each quote is tagged so the nightly cron can serve
  // preference-matching content.
  //
  quotes: defineTable({
    text: v.string(),
    // Plate above the quote on the poster. Permanently optional (#310) — a
    // titleless row renders with the plate omitted.
    title: v.optional(v.string()),
    // Theme slugs: "resilience", "self-compassion", "relationships",
    // "grief-and-loss", "change", "anxiety", "identity", "loneliness"
    themes: v.array(v.string()),
    // Optional source credit (author name). Not displayed in sharing card.
    source: v.optional(v.string()),
    language: v.optional(v.string()),
  })
    .index("by_theme_0", ["themes"])
    .searchIndex("search_text", { searchField: "text" }),

  // ===========================================================
  // 14. DAILY QUOTES
  // ===========================================================
  //
  // Daily log of quotes assigned to each user.
  // One curated + optionally one session-derived per user per day.
  // The client shows ONE quote: session-derived if available,
  // curated otherwise (Design Decision D2).
  //
  daily_quotes: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),

    // UTC ISO date string "YYYY-MM-DD". Always UTC (Ghana = UTC+0).
    date: v.string(),

    // "session" = generated from emotional context. "curated" = library pick.
    type: v.union(v.literal("session"), v.literal("curated")),

    // The quote text.
    text: v.string(),

    // Plate above the quote on the poster. Permanently optional (#310): a
    // rejected title stores as undefined rather than costing the user the quote.
    title: v.optional(v.string()),

    // Which sessions were used as context (session-derived only).
    sessionContextIds: v.optional(v.array(v.id("sessions"))),

    // true for session-derived (personalized) quotes, gated to Xolace+ via
    // hasPremium() in dailyQuotes.getToday. Always false for curated quotes.
    isPremium: v.boolean(),

    // User reaction. Null until the user reacts.
    // DEPRECATED(remove-after: app >= 1.10.0): the "not_today" literal only —
    // #303 ships no control for it, so no client writes it any more. Narrowing
    // the union NOW makes an old binary's react({reaction:"not_today"}) fail
    // argument validation: the button breaks visibly, it does not degrade. The
    // 9 existing rows stay; the toggle renders off and the first tap overwrites.
    reaction: v.optional(
      v.union(v.literal("resonates"), v.literal("not_today")),
    ),

    // When the user kept this quote. Undefined = not saved. Independent of
    // `reaction`: save means "I want this back" and populates the archive,
    // resonate means "this landed" and populates nothing (#311).
    //
    // RETENTION: nothing prunes daily_quotes today. Any future
    // jobs/dataRetention.ts pass over this table MUST skip rows with
    // `savedAt` set — a kept quote is the user's archive, not a cached daily.
    savedAt: v.optional(v.number()),

    // What the user wrote back to this quote. One per quote, editable, capped
    // at REPLY_MAX_LENGTH (dailyQuotes.ts). Fields on the row, not a join
    // table — the `savedAt` precedent, and it makes wipe/account-deletion
    // parity free: both loops already delete daily_quotes rows wholesale.
    //
    // This is raw user text on the quote path. It reaches tomorrow's quote
    // prompt bounded and guarded (#314) — see
    // docs/adr/0006-replies-cross-the-quote-metadata-boundary.md.
    reply: v.optional(v.string()),
    repliedAt: v.optional(v.number()),

    // `moderateInput` on send, and nothing else: no evaluateSafeguard, no
    // escalation_events row, because nothing was mirrored and there is no
    // verdict to record. Written on every send, flagged or not, so a reader
    // can tell "checked and clean" from "never checked". A flagged reply is
    // still stored, is excluded from the quote prompt, and is answered with
    // crisis resources in place of the "Kept safe" confirmation.
    // `unavailable: true` means moderation never actually ran (API down or no
    // key) — `flagged: false` there is an absence of a verdict, not a clean
    // one, so the reply is excluded from the quote prompt like a flagged one.
    replyModeration: v.optional(
      v.object({
        flagged: v.boolean(),
        categories: v.array(v.string()),
        checkedAt: v.number(),
        unavailable: v.optional(v.boolean()),
      }),
    ),

    createdAt: v.number(),
  })
    // Primary client query: "what are today's quotes for this user?"
    .index("by_profile_date", ["emotionalProfileId", "date"])

    // Cron idempotency: "has this user already got a quote today?"
    .index("by_profile_date_type", ["emotionalProfileId", "date", "type"])

    // The archive: saved quotes, newest first. Unsaved rows carry an
    // undefined `savedAt`, which sorts out of any numeric range — that is
    // what keeps them out of the paginated list, with no filter pass.
    .index("by_profile_saved", ["emotionalProfileId", "savedAt"]),

  // ===========================================================
  // 16. CONSENT RECORDS
  // ===========================================================
  //
  // Granular, auditable consent tracking.
  //
  // APPEND-ONLY. Never mutate a consent record.
  // Granting creates a record. Revoking creates a new record.
  // The full chain of grants and revocations is preserved
  // for legal audit.
  //
  // GDPR and similar regulations require proof of:
  // - When consent was given
  // - What version of consent language was shown
  // - When consent was withdrawn
  //
  // Boolean flags can't prove any of this.
  // This table can.
  //
  consent_records: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),

    // What was consented to.
    consentType: v.union(
      v.literal("reflection_pool_contribution"),
      v.literal("nudge_delivery"),
      v.literal("pattern_analysis"),
      v.literal("anonymized_research"),
      v.literal("voice_processing"), // Phase 2
      v.literal("therapy_summary_sharing"), // Phase 3
    ),

    // Current status from this action.
    status: v.union(v.literal("granted"), v.literal("revoked")),

    // Version of the consent language shown to the user.
    // If the wording changes, existing consents may need
    // re-confirmation.
    consentLanguageVersion: v.string(),

    // When this action occurred.
    grantedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),

    createdAt: v.number(),
  })
    // Check current consent status for a specific type.
    .index("by_profile_type", [
      "emotionalProfileId",
      "consentType",
      "createdAt",
    ]),

  // ===========================================================
  // 17. MONTHLY EVENTS ("Moments" layer — Phase 1)
  // ===========================================================
  //
  // Team-managed awareness events shown once per user per event.
  // Seed of the "Moments" infrastructure layer.
  // No server-side date filtering — client filters in local timezone.
  //
  monthlyEvents: defineTable({
    // Immutable identifier. Never rename post-publish — used as
    // the key in client-side seen tracking.
    slug: v.string(),

    title: v.string(),
    body: v.string(),

    // Optional CTA — only shown when both fields are present.
    ctaLabel: v.optional(v.string()),
    // Validated client-side against CTA_ROUTE_ALLOWLIST before router.push.
    ctaRoute: v.optional(v.string()),

    // Optional: injected as the reflect session prompt after dismiss.
    sessionPrompt: v.optional(v.string()),

    // Optional: CDN or Expo asset URL. Recommended: 686×360px ≤200KB.
    imageUrl: v.optional(v.string()),

    // Optional: https URL to a full article (e.g. blog post). Shown as an
    // external-link button in the sheet header when present.
    linkUrl: v.optional(v.string()),

    // ISO "YYYY-MM-DD" — client filters using local timezone string comparison.
    startDate: v.string(),
    endDate: v.string(),

    // 1 = highest priority. Used when multiple events are active simultaneously.
    priority: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_priority", ["priority", "startDate"]),

  // Intent-only premium teaser waitlist. During the pre-billing phase, tapping a
  // blurred insight teaser records a "notify me" intent here (no price, no IAP).
  // One row per profile per feature; idempotent on re-tap.
  insight_waitlist: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),
    // Which teaser drove the intent. Constrained to the known insight features.
    feature: insightFeatureValidator,
    joinedAt: v.number(),
  }).index("by_profile_feature", ["emotionalProfileId", "feature"]),

  // ===========================================================
  // 18. PRODUCT FEEDBACK (shake-summoned feedback tray)
  // ===========================================================
  //
  // Beta product feedback — bug reports and ideas. Deliberately
  // SEPARATE from the emotional `feedback` table: that table is
  // welded to the reflection loop (mirror_miss / gave_up / mood),
  // and mixing product feedback in would pollute the longitudinal
  // emotional dataset. Different domain, different table.
  //
  product_feedback: defineTable({
    // Server-derived owner scope (never accepted from client).
    // Optional ONLY because account deletion anonymizes in place: the owner
    // link is stripped and the row is retained. Always set on insert.
    emotionalProfileId: v.optional(v.id("emotional_profiles")),
    // "concern" is a safety report about a person, not a product complaint —
    // same table, but its own rate-limit bucket and its own moderation inbox
    // filter. "flag" is the lighter sibling: one message, pointed at from the
    // thread, unbudgeted, with `text` empty and `messageId` set. Both land in
    // Stream's moderation queue too. Only these two carry the fields below.
    kind: v.union(
      v.literal("bug"),
      v.literal("idea"),
      v.literal("concern"),
      v.literal("flag"),
    ),
    // Who the concern is about. Profile id ONLY — a display name is never
    // persisted, for the same reason the conversation roster matches on
    // profile id: names repeat and change, so a stored name is a stale label
    // on a moderation record.
    subjectProfileId: v.optional(v.id("emotional_profiles")),
    // The thread the concern came from, when it came from one. Absent when the
    // report was raised from a profile rather than inside a conversation.
    conversationId: v.optional(v.id("xolacer_conversations")),
    // The Stream message a "flag" points at. The content itself is never
    // copied here — the dashboard has it, keyed by this id.
    messageId: v.optional(v.string()),
    // 1..1000 chars, trimmed + validated server-side ("" for a flag).
    // RETAINED past account deletion by policy (see CONTEXT.md "Feedback
    // retention"). Treat as potentially identifying: a bug report can name
    // a person or place. Never surface it in anything user-facing.
    text: v.string(),
    // Submission context — helps triage without touching content.
    context: v.object({
      appVersion: v.string(), // from expo-constants
      route: v.string(), // pathname at submit time
      themeName: v.string(), // active color theme id
      platform: v.string(), // process.env.EXPO_OS
    }),
    createdAt: v.number(),
  }).index("by_profile_and_created", ["emotionalProfileId", "createdAt"]),

  // ===========================================================
  // 19. AVATARS (curated default-avatar catalog)
  // ===========================================================
  //
  // Team-curated avatar catalog — NOT user uploads. Images live in
  // Convex file storage; we upload them via the dashboard and seed a
  // row per avatar with `seedAvatar` (internal). The user's selected
  // avatar key is stored on `preferences.avatarId`; this table maps
  // that key to a renderable image.
  //
  // `storageId` is the canonical handle; `url` is denormalized at seed
  // time (Convex storage URLs are stable, not expiring) so the client
  // reads a plain row with no per-request getUrl() resolution. Because
  // the URL embeds the deployment domain, the catalog is seeded
  // per-environment (dev URLs differ from prod).
  //
  // `tier` is a forward seam for Xolace+ premium avatars; all launch
  // avatars are "free". Exactly one row should have isDefault: true —
  // it's the fallback shown when a user has no avatarId set.
  //
  avatars: defineTable({
    // Stable id stored in preferences.avatarId (e.g. "ember", "tide").
    key: v.string(),
    tier: v.union(v.literal("free"), v.literal("premium")),
    // Source of truth for the image file.
    storageId: v.id("_storage"),
    // Denormalized renderable URL, resolved from storageId at seed time.
    url: v.string(),
    // Sort order within a tier.
    order: v.number(),
    // Display caption + accessibility label (e.g. "Ember").
    label: v.string(),
    // Exactly one true → the default avatar (fallback when unset).
    isDefault: v.boolean(),
  })
    .index("by_key", ["key"])
    .index("by_tier_order", ["tier", "order"]),

  // ===========================================================
  // 20. FOLLOW-UP CARDS
  // ===========================================================
  //
  // One row per follow-up workflow execution. A session that left
  // something unresolved (escalation, gave_up, or AI-flagged) earns a
  // durable check-in. The Workflow owns this card's lifecycle; the app
  // reads it on open and surfaces a detached BottomSheet when it is "ready".
  //
  // At most ONE active (pending|ready) card exists per profile at a time
  // (enforced by startFollowUpWorkflow's idempotency + weight-aware
  // supersede). Privacy: rows + the owning workflow are purged in
  // dataWipe / accountDeletion.
  //
  follow_up_cards: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),

    // The session that triggered this follow-up.
    sessionId: v.id("sessions"),

    // The Workflow that owns this card's lifecycle. Branded WorkflowId.
    workflowId: vWorkflowId,

    // The follow-up cadence tier, computed at workflow start from session
    // weight. Drives sleep durations, push content, and the UI variant.
    tier: v.union(
      v.literal("acute"), // safeguard crisis — presence-first, wound-free push
      v.literal("elevated"), // elevated / grief|shame intensity≥7 / gave_up
      v.literal("standard"), // classifier flag, intensity < 7
    ),

    // What the card should say in-app. Generated (Haiku) at workflow start
    // from the session's mirror + classifier data, or FALLBACK_FOLLOWUP_CARD
    // on outage — so the sheet always has text and never renders a spinner.
    cardText: v.string(),

    // Whether the triggering session was escalation-derived. Gates the
    // "resources are still here" link in the UI.
    escalationDerived: v.boolean(),

    // The compounding domain the card names (#522). Set → the push stays
    // generic, since the lock screen isn't private.
    compoundingDomain: v.optional(domainValidator),

    // "pending"    — workflow active, card not yet due
    // "ready"      — user returned (or nudge fired); show on next open
    // "shown"      — card was rendered in-app, awaiting user response
    // "resolved"   — user tapped a response or dismissed
    // "expired"    — workflow timed out with no return
    // "superseded" — a newer, equal-or-higher-weight session replaced it;
    //                stays visible/tappable until an explicit user dismiss
    status: v.union(
      v.literal("pending"),
      v.literal("ready"),
      v.literal("shown"),
      v.literal("resolved"),
      v.literal("expired"),
      v.literal("superseded"),
    ),

    // User's response to the check-in card. null until resolved/dismissed.
    userResponse: v.optional(
      v.union(
        v.literal("lighter"), // "Feeling lighter now"
        v.literal("still_here"), // "Still sitting with it"
        v.literal("heavier"), // "Got heavier actually"
        v.literal("processed"), // "I worked through it"
        v.literal("vent"), // "Let it out" → opened a fresh reflect session
        v.literal("dismissed"), // Tapped away without responding
      ),
    ),

    createdAt: v.number(),
    shownAt: v.optional(v.number()),
    resolvedAt: v.optional(v.number()),
  })
    // App open query: "is there a ready/pending card for this user?"
    .index("by_profile_status", ["emotionalProfileId", "status", "createdAt"])

    // Profile screen: follow-up history, newest first.
    .index("by_profile_created", ["emotionalProfileId", "createdAt"])

    // Workflow cancellation / onComplete lookup.
    .index("by_workflow", ["workflowId"])

    // Session cascade delete (lib/sessionCascade.purgeSessions).
    .index("by_session", ["sessionId"]),

  // The structured half of a check-in answer (issue #447): what the user wrote
  // or chose AFTER picking a chip. Kept off `follow_up_cards` so that table
  // stays lean and its `userResponse` enum stays the single outcome field.
  // At most one row per card (followUpResponses.record upserts). Dies with its
  // card — see deleteResponsesForCard.
  follow_up_responses: defineTable({
    cardId: v.id("follow_up_cards"),
    // Denormalized from the card so consolidation can read a profile's
    // responses without walking cards.
    emotionalProfileId: v.id("emotional_profiles"),
    // "What helped?" (lighter / processed). Trimmed; absent when blank.
    reflectionText: v.optional(v.string()),
    // The user asked for the reflection to go to peer-reflections. Intent
    // only — sharing itself runs through the existing consent flow.
    shareRequested: v.boolean(),
    // Which option the user took from the "heavier" menu, if any.
    heavierChoice: v.optional(
      v.union(
        v.literal("crisis_resources"),
        v.literal("music"),
        v.literal("support_audio"),
        v.literal("library"),
      ),
    ),
    // When the share job was first enqueued (#449). Set once and never
    // cleared, so share → private → share can't contribute twice.
    shareScheduledAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_card", ["cardId"])
    .index("by_profile_created", ["emotionalProfileId", "createdAt"]),

  // ===========================================================
  // 21. SEMANTIC PROFILES (Cognition Layer §1.2)
  // ===========================================================
  //
  // The AI-written narrative of who this person is emotionally.
  // Written ONLY by the Reflection Agent (Phase 3); read by the
  // articulator context and, progressively, the insights UI.
  //
  // Versioning is append-only: each consolidation pass inserts a
  // new row and moves emotional_profiles.currentSemanticProfileId.
  // Rollback = point the pointer at an older row. Old versions are
  // swept by retention; ALL versions die in dataWipe/accountDeletion.
  //
  // Written in user-safe, non-clinical language from day one — the
  // same artifact is both the internal working document and the
  // earned insights surface.
  //
  semantic_profiles: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),

    // Monotonic version number per profile (1, 2, 3...).
    version: v.number(),

    // --- Narrative sections ---
    // What this person keeps carrying.
    recurringThemes: v.optional(v.string()),
    // e.g. "anger usually masks fear; goes quiet rather than escalating"
    emotionalSignatures: v.optional(v.string()),
    // What lands: tone that gets confirmations, mirror length preference.
    // Written by the Phase 4 tone loop via the consolidation pass.
    calibration: v.optional(v.string()),
    // Where things have been heading recently. Fast-moving — the
    // post-session light pass updates this most often.
    trajectory: v.optional(v.string()),

    // Which writer produced this version, for feedback attribution
    // ("confirmation rate dropped after profile v14") and auditability.
    // Format mirrors mirrorModelVersion: "{writer}-v{N}-{model}".
    writerVersion: v.string(),

    createdAt: v.number(),
  })
    // Pointer resolution + version history, newest first.
    .index("by_profile_version", ["emotionalProfileId", "version"]),

  // ===========================================================
  // XOLACER PROFILES
  // ===========================================================
  //
  // Public-facing data for trained peer xolacers (ambassadors).
  // Keyed by emotionalProfileId like every other child table —
  // the Stream chat identity is the pseudonymous profile id, so
  // a xolacer's real-world identity never reaches Stream.
  //
  // A profile is not listed in the directory until the xolacer
  // finishes filling it in (complete) and is taking conversations
  // (active).
  //
  xolacer_profiles: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),

    // All optional until the xolacer publishes. `complete` mirrors
    // "displayName + bio + photoUrl all present" — set server-side
    // on publish, never client-computed.
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    // What this xolacer is comfortable sitting with — max 3, life
    // situations rather than diagnoses (see lib/specialties.ts).
    specialties: v.optional(v.array(specialtyValidator)),

    // Denormalized rating counters. Convex has no count operator, so the
    // aggregate is maintained by rateConversation rather than scanned.
    // Averages stay hidden until MIN_RATINGS_TO_DISPLAY (see xolacerChat).
    ratingSum: v.optional(v.number()),
    ratingCount: v.optional(v.number()),

    complete: v.boolean(),
    // Operator/xolacer availability switch. Inactive xolacers stay
    // out of the directory and can't receive new requests, but open
    // conversations keep working.
    active: v.boolean(),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_profile", ["emotionalProfileId"])
    // Directory listing: complete && active.
    .index("by_complete_and_active", ["complete", "active"]),

  // ===========================================================
  // XOLACER CONVERSATIONS
  // ===========================================================
  //
  // One row per (user, xolacer) pair, ever — re-requesting someone
  // you already talked to reopens this row, never creates a second.
  // The row is the source of truth for lifecycle; Stream only holds
  // message content for accepted conversations.
  //
  // Lifecycle: requested → open → resting ⇄ open, → closed.
  //  - requested: user asked, xolacer hasn't answered (7d expiry).
  //  - open: accepted; counts against the xolacer's volume cap.
  //  - resting: 14d with no message; readable, frees the cap slot.
  //  - closed: declined, expired, blocked, or xolacer left.
  //
  xolacer_conversations: defineTable({
    userProfileId: v.id("emotional_profiles"),
    xolacerProfileId: v.id("emotional_profiles"),

    status: v.union(
      v.literal("requested"),
      v.literal("open"),
      v.literal("resting"),
      v.literal("closed"),
    ),
    // Why a conversation is closed — drives the no-guilt copy variant.
    closedReason: v.optional(
      v.union(
        v.literal("declined"),
        v.literal("expired"),
        v.literal("blocked"),
        v.literal("xolacer_left"),
      ),
    ),

    // What this xolacer calls this seeker: the 4 characters after "Camper".
    // Drawn at random when the pair is first created, and stable for the row's
    // whole life, so the same xolacer keeps recognising a returning seeker
    // while another xolacer pairing with them sees an unrelated name. Absent
    // on rows written before the field — those read off their own row id
    // instead, and heal onto this field the next time a mutation touches them
    // (see lib/camperTag).
    camperTag: v.optional(v.string()),

    // Stream channel id (not cid). Set on accept; absent while requested.
    streamChannelId: v.optional(v.string()),

    requestedAt: v.number(),
    acceptedAt: v.optional(v.number()),
    // When the xolacer declined, which is what the re-request cooldown counts
    // from — `requestedAt` would start the clock when the request was sent, so
    // a decline on day six of a week-old request would already be spent.
    // Absent on rows declined before the field existed: those wait for nothing.
    declinedAt: v.optional(v.number()),
    // Drives the resting sweep. Updated by touchConversation on send.
    lastMessageAt: v.optional(v.number()),
    // Messages exchanged here, counted server-side by `notifyNewMessage` (the
    // Stream webhook) on every status, so a conversation that keeps going
    // quietly while `resting` still accumulates. Gates rating — see
    // `MIN_MESSAGES_TO_RATE`. Absent on rows that predate the field and read
    // as 0; deliberately not backfilled.
    messageCount: v.optional(v.number()),
    // When a message notification last went out to each side. Two fields and
    // not one: a single row-wide stamp let the seeker's own message open a
    // window that then swallowed the xolacer's reply to it. Absent until that
    // side has been notified once, and written only when a push actually goes
    // out — see `notifyNewMessage`.
    lastNotifiedUserAt: v.optional(v.number()),
    lastNotifiedXolacerAt: v.optional(v.number()),
    // DEPRECATED(remove-after: no live rows carry it): the row-wide stamp the
    // two fields above replaced. Nothing reads or writes it; kept only so rows
    // written before the split still validate. A stale value is harmless — the
    // window it described was two minutes long.
    lastMessageNotifiedAt: v.optional(v.number()),

    // Where this request came from, derived from session recency at request
    // time (see lib/xolacerSuggestion.conversationOrigin) and recomputed on
    // every transition back into "requested". Absent on rows written before
    // the feature — those read as direct, and are not backfilled. Carries
    // origin only: never the theme, never anything the user hasn't said yet.
    origin: v.optional(v.union(v.literal("suggestion"), v.literal("direct"))),

    // Per-side "hide this from my list" stamps. Not `status` — archiving is
    // one party's view of the row and never changes what the other sees.
    // Read through `isArchivedFor`, which treats any activity landing after
    // the stamp as un-archiving it: a live conversation silently buried
    // behind an archive tap is the wrong failure mode for a support app.
    archivedByUserAt: v.optional(v.number()),
    archivedByXolacerAt: v.optional(v.number()),

    // Which path put this row into `resting`: the xolacer wrapping it up
    // early ("manual") or the 14-day quiet sweep ("quiet"). Same state either
    // way — this only distinguishes them for copy and analytics.
    restingReason: v.optional(v.union(v.literal("manual"), v.literal("quiet"))),

    // Per-side delete flags, only ever set on a row that closed as `declined`
    // or `expired` (see `canDelete`). Two flags and not a hard delete so one
    // side can never destroy the other's copy; once both are set the row is
    // purged inline. Unlike archive, these do not reverse — a terminal
    // request row has no activity left to reverse them.
    deletedByUser: v.optional(v.boolean()),
    deletedByXolacer: v.optional(v.boolean()),
  })
    // Seeker-side inbox (prefix scan) and pending-request cap counting.
    .index("by_user_and_status", ["userProfileId", "status"])
    // Volume-cap counting and xolacer-side inbox.
    .index("by_xolacer_and_status", ["xolacerProfileId", "status"])
    // One-conversation-per-pair lookup.
    .index("by_user_and_xolacer", ["userProfileId", "xolacerProfileId"])
    // Cron sweep: open-but-quiet → resting, requested-but-stale → closed.
    .index("by_status_and_lastMessageAt", ["status", "lastMessageAt"]),

  // ===========================================================
  // CONVERSATION RATINGS
  // ===========================================================
  //
  // One row per conversation, written only by the person who asked to
  // talk (a xolacer never rates the people who come to them). Editable
  // — re-rating patches this row and adjusts the xolacer's counters by
  // the delta, so the aggregate can't be inflated by rating twice.
  //
  // Only ratable once real messages were exchanged, which makes a
  // drive-by rating from a never-answered request impossible.
  //
  conversation_ratings: defineTable({
    conversationId: v.id("xolacer_conversations"),
    raterProfileId: v.id("emotional_profiles"),
    xolacerProfileId: v.id("emotional_profiles"),
    // 1–5, integer. Validated server-side, never trusted from the client.
    rating: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    // One rating per conversation — also the "have I already rated?" lookup.
    .index("by_conversation", ["conversationId"])
    // Account deletion sweeps a rater's rows.
    .index("by_rater", ["raterProfileId"])
    // Account deletion sweeps the rows a xolacer received.
    .index("by_xolacer", ["xolacerProfileId"]),

  // ===========================================================
  // XOLACE CHANNEL CACHE (#376)
  // ===========================================================
  //
  // Exactly one row. The shared Xolace broadcast channel (CONTEXT.md, "The
  // Xolace channel") has no `xolacer_conversations` row of its own, so
  // `myConversations` (#377) needs its last-message text/sender/time from
  // somewhere else — kept current by the same `message.new` webhook that
  // maintains `messageCount` for a real conversation, special-cased onto
  // this table instead.
  //
  xolace_channel_cache: defineTable({
    text: v.string(),
    senderId: v.string(),
    sentAt: v.number(),
    // When the last message push went out (#378). Read the same way as a
    // conversation's `lastNotifiedUserAt`/`lastNotifiedXolacerAt`: a second
    // message inside `MESSAGE_NOTIFICATION_WINDOW_MS` sends badge-only.
    // Shared across every recipient rather than per-profile — the whole
    // membership is fanned out from one job run per message, so they are
    // always all loud or all silent together.
    lastNotifiedAt: v.optional(v.number()),
  }),

  // ===========================================================
  // WEEKLY COHORT COUNTS
  // ===========================================================
  //
  // One row per completed calendar week: how many DISTINCT campers carried
  // each of the 13 classifier emotions that week. Written once by the Monday
  // cron (jobs/cohortCounts.ts), read O(1) by the Discovery cohort card.
  //
  // Materialized rather than counted live because Convex has no `.count()` and
  // the existing TableAggregate can't group by a dynamic value — see ADR 0004.
  //
  cohort_weekly_counts: defineTable({
    // Monday 00:00 UTC of the week counted. Also the row's identity.
    weekStart: v.number(),
    // Exclusive end — the following Monday 00:00 UTC.
    weekEnd: v.number(),
    // emotion → distinct camper count. Absent key means zero.
    counts: v.record(v.string(), v.number()),
    computedAt: v.number(),
  })
    // "the most recent week we have" — and the cron's own idempotency lookup.
    .index("by_weekStart", ["weekStart"]),

  // ===========================================================
  // STREAM WEBHOOK DEDUPE
  // ===========================================================
  //
  // One row per Stream event we have already counted, keyed by the stable
  // `X-Webhook-Id` header Stream reuses across retries of the same event.
  // Stream retries any delivery it cannot confirm, and a replayed
  // `message.new` would otherwise increment `messageCount` twice — handing a
  // pair the rating gate they had not actually reached. Purged by the xolacer
  // sweep once a day old, far past Stream's retry window.
  //
  stream_webhook_events: defineTable({
    webhookId: v.string(),
  }).index("by_webhookId", ["webhookId"]),

  // ===========================================================
  // CHAT MODERATION VERDICTS (#344)
  // ===========================================================
  //
  // One row per Xolacer DM the post-delivery lane classified. Category and
  // confidence, never the message text — useful to the maintainer without
  // becoming a transcript store. Never read by Understanding or Memory.
  // `by_messageId` is the idempotency key: a redelivered webhook finds its
  // row and neither spends a second model call nor sends a second card.
  //
  chat_moderation_events: defineTable({
    conversationId: v.id("xolacer_conversations"),
    streamMessageId: v.string(),
    senderRole: conversationRoleValidator,
    level: safeguardLevelValidator,
    categories: v.array(chatModerationCategoryValidator),
    confidence: v.number(),
    modelVersion: v.string(),
    createdAt: v.number(),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_messageId", ["streamMessageId"]),

  // ===========================================================
  // KINDLING CATALOGUE — audio_tracks (#328)
  // ===========================================================
  //
  // One table, two families (`support` / `music`); an episode is a support
  // row with `series` set — no third family arm. Cascade-exempt by
  // construction: no sessionId/profileId, so sessionCascade.test.ts's schema
  // walk never sees it — these rows are shared across every user and must
  // survive session cascade, data wipe, and account deletion.
  //
  // Blobs (`key`, `thumbKey`) live in Cloudflare R2 via @convex-dev/r2
  // (docs/paths-v1.md §3.2, map decision — issue #321); everything else
  // stays on Convex. See docs/paths-v1.md §3 for the full spec.
  //
  audio_tracks: defineTable({
    slug: v.string(), // stable id: binding + idempotent re-ingest
    family: v.union(v.literal("support"), v.literal("music")),
    title: v.string(),
    topic: v.string(), // the audio_topic_* / music_topic_* catalog entry
    tags: v.array(v.string()), // curated: shared emotion/theme vocab, binder-scored, both families
    sourceTags: v.array(v.string()), // raw, unedited source tags (e.g. Pixabay), preserved losslessly
    key: v.string(), // R2 object key, e.g. `${family}/${slug}.m4a`
    thumbKey: v.string(), // R2 key, content-addressed: `thumb/${thumbSha256}.webp`
    durationSec: v.number(),
    sha256: v.string(), // audio re-ingest idempotency
    thumbSha256: v.string(), // thumbnail idempotency, independent of audio
    thumbhash: v.optional(v.string()), // base64 ThumbHash of the thumb, the blurred placeholder while it loads
    active: v.boolean(), // retire (licence lapse) without deleting
    newUntil: v.optional(v.number()), // ms epoch; in the Browse "New" shelf while > now
    featured: v.optional(v.boolean()), // hand-picked Browse hero; set from the Convex dashboard

    // support-family
    narrators: v.optional(v.array(v.string())), // display strings: ["Sage"], ["Sage","Ash"]

    // episode (support-family with a series) — Track 1 "The Spectrum" / Track 2
    series: v.optional(v.string()), // series slug
    seriesTitle: v.optional(v.string()), // denormalised for browse tiles
    episodeNumber: v.optional(v.number()),
    tier: v.optional(v.number()), // acuity 1-4; tier >= 3 requires safetyReviewedAt
    safetyReviewedAt: v.optional(v.number()),

    // music-family
    licence: v.optional(licenceValidator), // required at write for family="music"

    // Browse search (#550): lowercase title, topic, tags, narrators, series
    // title (+ raw source tags for music), written by upsertTrack
    // (library/searchText.ts trackSearchTextOf).
    searchText: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_family_and_topic", ["family", "topic"])
    .index("by_family_and_active", ["family", "active"]) // Browse per-family list (#339)
    .index("by_thumbKey", ["thumbKey"])
    .searchIndex("search_searchText", { searchField: "searchText", filterFields: ["active", "family"] }),

  // Topic decoration (#353): a shared topic suffix (`sadness`) may carry its
  // own cover and display title for the Browse topic grid. One row per slug
  // across both families; membership stays "≥ 1 active track" — a row here
  // never adds a tile. Cascade-exempt for the same reason as `audio_tracks`.
  topics: defineTable({
    slug: v.string(), // the shared suffix, validated against the model catalogue at write
    title: v.optional(v.string()), // curated display title; else derived from the slug
    thumbKey: v.string(), // R2 key, content-addressed: `thumb/${thumbSha256}.<ext>`
    thumbSha256: v.string(),
    thumbhash: v.optional(v.string()), // base64 ThumbHash of the cover
  })
    .index("by_slug", ["slug"])
    .index("by_thumbKey", ["thumbKey"]), // discardUpload: is this blob still referenced?

  // ===========================================================
  // KINDLING — paths + path_steps (#330, docs/paths-v1.md §7)
  // ===========================================================
  //
  // A kindling (`paths` row) is the Plus-only bundle of 2-3 twigs
  // (`path_steps`) generated in the background after a qualifying session.
  // Unrelated to the free post-mirror "next step" (`session.pathChosen`,
  // `completePath`) — ADR 0008. Both tables are in SESSION_CASCADE_TABLES:
  // `paths` carries the sessionId directly, `path_steps` transitively via
  // `pathId`.
  //
  paths: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),
    sessionId: v.id("sessions"), // the session that generated it
    emotionalProfileVersionId: v.optional(v.id("semantic_profiles")), // profile version in context
    // One `active` per profile; a new kindling flips the previous one to
    // `replaced` (archived, never deleted).
    status: v.union(
      v.literal("active"),
      v.literal("replaced"),
      v.literal("dismissed"),
      v.literal("completed"),
    ),
    model: v.string(),
    modelVersion: v.string(),
    // Generation refs for eval (§2.2) — cheap to capture off the response.
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    generatedAt: v.number(),
  })
    .index("by_profile_and_status", ["emotionalProfileId", "status"])
    .index("by_session", ["sessionId"]),

  path_steps: defineTable({
    pathId: v.id("paths"),
    actionType: v.string(), // catalog key
    order: v.number(), // model's suggested sequence, 1-based
    why: v.string(),
    params: v.any(), // binding output: { slug } | exerciseId | xolacerRef
    state: v.union(
      v.literal("pending"),
      v.literal("done"),
      v.literal("skipped"),
    ),
    why_: v.optional(v.string()), // (reserved) tuning notes
  }).index("by_path", ["pathId"]),

  // ===========================================================
  // LIBRARY — curated reading (#405, CONTEXT.md "Library", ADR 0015)
  // ===========================================================
  //
  // Shared catalogue rows, cascade-exempt like `audio_tracks`: no
  // sessionId/profileId, never touched by wipe or account deletion.
  // Written only by the curator ingest (scripts/library, #406); retraction
  // is `active: false`, never a delete (#404).
  //
  library_sources: defineTable({
    slug: v.string(),
    name: v.string(), // publisher, as credited: "NHS", "NIMH", "Xolace"
    url: v.optional(v.string()),
    logoUrl: v.optional(v.string()), // stable URL (#386), not a signed one
    // Reuse terms belong to the source (#384).
    licence: v.string(), // e.g. "OGL v3.0", "US public domain", "Xolace original"
    permission: v.union(
      v.literal("not_required"),
      v.literal("granted"),
      v.literal("pending"),
    ),
    attributionText: v.string(), // required credit line, shown on every entry
    dropBrandingIfAdapted: v.boolean(), // no logo on an adapted entry's credit
    refreshDays: v.optional(v.number()), // verbatim refresh SLA, e.g. NHS = 7
    sha256: v.optional(v.string()), // ingest no-op gate (#406)
  }).index("by_slug", ["slug"]),

  library_entries: defineTable({
    slug: v.string(),
    kind: v.union(v.literal("explainer"), v.literal("advice"), v.literal("story")),
    title: v.string(),
    dek: v.string(),
    primarySubject: v.string(), // shelf home; also written as a `subject` facet
    reuse: v.union(v.literal("verbatim"), v.literal("adapted"), v.literal("original")),
    readMin: v.number(), // computed at ingest
    active: v.boolean(),
    newUntil: v.optional(v.number()),
    coverUrl: v.optional(v.string()), // else the primary subject's cover
    coverKey: v.optional(v.string()), // ingest: R2 key of an uploaded cover, `library-thumb/<sha>.<ext>`; signed at read, wins over coverUrl
    cover512Key: v.optional(v.string()), // ingest --cover-variants (#506): 512px WebP for small thumbnails
    cover1280Key: v.optional(v.string()), // ingest --cover-variants (#506): 1280px WebP; wins over coverKey
    coverThumbhash: v.optional(v.string()), // ingest --cover-variants (#507): base64 ThumbHash, the cover's load placeholder
    publishedAt: v.optional(v.number()),
    retrievedAt: v.optional(v.number()),
    storyDescriptor: v.optional(v.string()), // stories: "a second-year student, 20"
    contentNote: v.optional(v.string()), // curator's heads-up shown before a heavy body (#413)
    reflectPrompt: v.optional(v.string()), // curator's "Reflect on this" opener; else a plain default (#413)
    // Curator-only — never returned to readers (#387, #404).
    consentRecordedAt: v.optional(v.number()), // stories: required to publish
    safetyReviewedAt: v.optional(v.number()), // explainers: required to publish
    lastReviewedAt: v.number(),
    sha256: v.optional(v.string()), // ingest no-op gate: manifest record + body (#406)
    // Browse search (#549): lowercase title, dek, subject, story descriptor and
    // facet words, written by ingest (library/search.ts searchTextOf).
    searchText: v.optional(v.string()),
  })
    .index("by_slug", ["slug"])
    .index("by_active_and_kind", ["active", "kind"])
    .searchIndex("search_searchText", { searchField: "searchText", filterFields: ["active"] }),

  // What an entry draws on, one row per (entry, source) pair in manifest
  // order (#468, CONTEXT.md "Most entries are adapted from several
  // sources"). A publisher may appear twice with different pages.
  library_entry_sources: defineTable({
    entryId: v.id("library_entries"),
    sourceId: v.id("library_sources"),
    order: v.number(),
    pageTitle: v.string(),
    pageUrl: v.optional(v.string()),
    author: v.optional(v.string()),
    retrievedAt: v.optional(v.number()),
  }).index("by_entryId_and_order", ["entryId", "order"]),

  // GFM markdown (#386), kept off `library_entries` so lists skip it.
  library_entry_bodies: defineTable({
    entryId: v.id("library_entries"),
    markdown: v.string(),
  }).index("by_entryId", ["entryId"]),

  // One narrated clip per entry (#411, decision in #390). The R2-key +
  // sha256 + durationSec pattern of `audio_tracks`, not that table. Two
  // blobs: `previewKey` is a separate 30s cut anyone may stream; `key` is
  // only ever minted behind `requirePremium`. Retract with `active: false`.
  library_entry_audio: defineTable({
    entryId: v.id("library_entries"),
    key: v.string(), // full asset — Plus only
    previewKey: v.string(), // truncated 30s asset — free
    durationSec: v.number(), // of the full asset; the card's "M min listen"
    title: v.optional(v.string()), // the player's title for an adapted narration; else the entry's
    sha256: v.string(), // full audio + transcript (the preview is cut from it): ingest no-op gate
    active: v.boolean(),
  }).index("by_entryId", ["entryId"]),

  // Plain text of what's said (CONTEXT.md "Library: transcript") — Plus only,
  // kept off `library_entry_audio` so card reads skip it.
  library_entry_transcripts: defineTable({
    entryId: v.id("library_entries"),
    text: v.string(),
  }).index("by_entryId", ["entryId"]),

  // Facets are generic (axis, slug) rows, not per-axis columns (ADR 0015),
  // so every value is indexable and a new axis needs no schema change.
  // `emotion` / `lifeArea` slugs come from lib/understandingVocab.ts.
  library_entry_facets: defineTable({
    entryId: v.id("library_entries"),
    axis: v.string(), // subject | audience | emotion | lifeArea | …
    slug: v.string(),
  })
    .index("by_entryId", ["entryId"])
    .index("by_axis_and_slug", ["axis", "slug"]),

  // An editor's ordered reading list. Items are a tagged union so a series
  // or app action can join later as a new variant (ADR 0015).
  library_hubs: defineTable({
    slug: v.string(),
    title: v.string(),
    intro: v.string(),
    coverUrl: v.optional(v.string()),
    coverKey: v.optional(v.string()), // ingest: R2 key of an uploaded cover, `hub-cover/<sha>.<ext>`; signed at read, wins over coverUrl
    cover1280Key: v.optional(v.string()), // ingest --cover-variants (#508): 1280px WebP; wins over coverKey (hubs are never shown small)
    coverThumbhash: v.optional(v.string()), // ingest --cover-variants (#508): base64 ThumbHash, the cover's load placeholder
    active: v.boolean(),
    items: v.array(
      v.union(
        v.object({ kind: v.literal("entry"), entryId: v.id("library_entries") }),
        v.object({ kind: v.literal("audio"), audioTrackId: v.id("audio_tracks") }),
      ),
    ), // bounded by editorial practice (a hub is a short running order)
    sha256: v.optional(v.string()), // ingest no-op gate (#406)
  })
    .index("by_slug", ["slug"])
    .index("by_active", ["active"]),

  // What a reader leaves behind on an entry (#410, CONTEXT.md "Library:
  // finished, helped, saved"). Private: one row per (profile, entry), purged
  // by wipe and account deletion.
  library_reads: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),
    entryId: v.id("library_entries"),
    viewedAt: v.optional(v.number()), // first reader open — the one view
    position: v.optional(v.number()), // resume: 0–1 of the scrollable body
    finishedAt: v.optional(v.number()), // reached the end AND dwelt; never shown
    lastReadAt: v.optional(v.number()), // last open or position write — orders Continue reading (#419)
    saved: v.boolean(),
    helped: v.boolean(),
  })
    .index("by_emotionalProfileId_and_entryId", ["emotionalProfileId", "entryId"])
    // finishedAt first so Continue reading only walks unfinished rows (#419).
    .index("by_emotionalProfileId_and_finishedAt_and_lastReadAt", ["emotionalProfileId", "finishedAt", "lastReadAt"]),

  // Public totals, off `library_entries` because ingest `replace`s those
  // rows. Never decremented by wipe/deletion — only an undo of "helped"
  // subtracts (ADR 0016). Never seeded.
  library_entry_totals: defineTable({
    entryId: v.id("library_entries"),
    views: v.number(),
    helped: v.number(),
  }).index("by_entryId", ["entryId"]),

  // One run of a domain compounding (ADR 0020, CONTEXT.md "Stretch"). Stored,
  // never replayed: written by compounding/stretches.evaluateCompounding when
  // a reading lands. At most one open row (no endedAt) per profile + domain.
  // Retention drops closed rows past the cutoff, never open ones; wipe and
  // account deletion drop all.
  compounding_stretches: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),
    domain: domainValidator,
    startedAt: v.number(),
    // The baseline held while the stretch runs, for at most 90 days.
    anchorBaseline: v.number(),
    // Absent while open. A quiet stretch's end (last reading + 30 days) is
    // written by the next evaluation; readers derive it until then.
    endedAt: v.optional(v.number()),
    // Events no reading records (#492, #496): once set, spent for the stretch.
    followUpStartedAt: v.optional(v.number()),
    upsellShownAt: v.optional(v.number()),
  })
    .index("by_emotionalProfileId_and_domain_and_startedAt", ["emotionalProfileId", "domain", "startedAt"])
    .index("by_emotionalProfileId_and_endedAt", ["emotionalProfileId", "endedAt"]),

  // Steadiness insights (#525, #526, ADR 0019): written by the Reflection
  // Agent's consolidation pass, only after the quality gate passes. Each run
  // replaces the last run's set. Retention drops a row once its oldest cited
  // session is past the cutoff; a wipe or account deletion drops every row.
  steadiness_insights: defineTable({
    emotionalProfileId: v.id("emotional_profiles"),
    kind: v.union(
      // Overall (under the dial), then per-domain (#526).
      v.literal("thread"), v.literal("crowding"),
      v.literal("say_vs_after"), v.literal("relief"), v.literal("absence"),
      // DEPRECATED(remove-after: no steadiness_insights row has these kinds): #525's
      // first build; never shown (insightsFor drops them), replaced by each profile's next run.
      v.literal("link"), v.literal("helped"), v.literal("then_now"), v.literal("shape"),
    ),
    // One domain; an overall insight names every domain it spans, the lead one first.
    domains: v.array(domainValidator),
    // What the text claims about the lead domain against its usual (#526):
    // anything but "none" waits for that domain to settle.
    direction: v.optional(v.union(v.literal("lower"), v.literal("higher"), v.literal("none"))),
    // Each named domain's raw steadiness when written, in `domains` order: the
    // insight is hidden once one moves past its reliable-change band (#526).
    scoresAt: v.optional(v.array(v.number())),
    text: v.string(),
    citedSessionIds: v.array(v.id("sessions")),
    oldestCitedAt: v.number(),
    // The consolidation run that wrote it; a run's end clears older runs' rows (#531).
    runAt: v.number(),
    writtenAt: v.number(),
  }).index("by_emotionalProfileId_and_oldestCitedAt", ["emotionalProfileId", "oldestCitedAt"]),
});

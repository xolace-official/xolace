import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	type ActionCtx,
	internalAction,
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "./_generated/server";
import { keepsWordsPrivate } from "./ai/safeguard";
import {
	DEFAULT_IMPORTANCE,
	isActionableFeedback,
	type MemoryFeedback,
	REPLY_IMPORTANCE,
} from "./episodicImportance";
import {
	EPISODIC_STATUS,
	NO_GRANULAR_LABEL,
	NO_PRIMARY_EMOTION,
	REPLY_STATUS,
	rag,
} from "./rag";

// =============================================================
// EPISODIC MEMORY — per-session composite documents, semantically
// searchable in the user's PERSONAL namespace (Cognition Layer §1.1).
//
// namespace = emotionalProfileId → never cross-user by construction.
// key = sessionId → re-ingestion is an idempotent replace, and
// retention purges / data wipes cascade by key. Wipe parity is a
// hard invariant: the purge lives in the SAME jobs that delete
// sessions (jobs/dataRetention.ts, jobs/dataWipe.ts,
// jobs/accountDeletion.ts), never a best-effort sidecar.
//
// Composite (decision log #1 — raw text IS in):
//   [raw user text]     max matching + verbatim recall fidelity
//   [mirror text]       the AI's articulation
//   [distilledText]     compressed emotional core, when it exists
//   [metadata line]     emotion / intensity / tags / temporal context
//
// Metadata-only embedding (no raw/mirror/distilled text) when:
//   - the session is crisis-level (§6 v1 default — trajectory value
//     without storing crisis text), or
//   - the user turned personal memory off (§1.1b toggle).
// Burned sessions (kept === false) are never embedded at all.
// =============================================================

interface EpisodicSource {
	distilledText: string | null;
	emotionalProfileId: Id<"emotional_profiles">;
	granularLabel: string | null;
	// Learned salience weight (Loop #3), mirrored into the RAG vector's
	// native importance so re-ingestion preserves it instead of resetting to 1.
	importance: number;
	metadataLine: string;
	metadataOnly: boolean;
	mirrorText: string | null;
	primaryEmotion: string;
	rawInput: string | null;
}

/** Concatenate the composite document for embedding. */
function buildComposite(source: EpisodicSource): string {
	if (source.metadataOnly) {
		return source.metadataLine;
	}
	const parts = [
		source.rawInput,
		source.mirrorText,
		source.distilledText,
		source.metadataLine,
	].filter((p): p is string => !!p && p.trim().length > 0);
	return parts.join("\n\n");
}

/**
 * Everything needed to embed one session, or null when the session
 * should not be in memory (missing, burned, or never classified).
 */
export const getSessionForEpisodic = internalQuery({
	args: { sessionId: v.id("sessions") },
	handler: async (ctx, args): Promise<EpisodicSource | null> => {
		const session = await ctx.db.get("sessions", args.sessionId);
		if (!session) {
			return null;
		}

		// Burned / ephemeral sessions never enter memory.
		if (session.kept === false) {
			return null;
		}

		const metadata = await ctx.db
			.query("emotional_metadata")
			.withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
			.unique();
		// No classification → mirror never happened → nothing to remember.
		if (!metadata) {
			return null;
		}

		const preferences = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", session.emotionalProfileId)
			)
			.unique();

		// undefined = on by default (§1.1b).
		const personalMemoryEnabled = preferences?.personalMemoryEnabled !== false;
		// Crisis sessions (and a talk at elevated, #599) embed metadata-only
		// until the §6 revisit lands.
		const isCrisis = keepsWordsPrivate(
			session.entryType,
			session.safeguardLevel
		);

		const metadataLine = [
			`emotion: ${metadata.primaryEmotion}`,
			metadata.granularLabel ? `granular: ${metadata.granularLabel}` : null,
			`intensity: ${metadata.intensity}/10`,
			metadata.thematicTags.length > 0
				? `themes: ${metadata.thematicTags.join(", ")}`
				: null,
			metadata.userLanguageTags.length > 0
				? `their words: ${metadata.userLanguageTags.join(", ")}`
				: null,
			metadata.temporalContext ? `temporal: ${metadata.temporalContext}` : null,
		]
			.filter((p): p is string => !!p)
			.join(" | ");

		return {
			distilledText: session.distilledText ?? null,
			emotionalProfileId: session.emotionalProfileId,
			granularLabel: metadata.granularLabel ?? null,
			importance: metadata.episodicImportance ?? DEFAULT_IMPORTANCE,
			metadataLine,
			metadataOnly: isCrisis || !personalMemoryEnabled,
			mirrorText: session.mirrorText ?? null,
			primaryEmotion: metadata.primaryEmotion,
			rawInput: session.rawInput ?? null,
		};
	},
});

/**
 * Embed one session into its owner's personal namespace. Keyed on the
 * session id → replaces cleanly on re-run. When the session should not
 * be in memory (deleted, burned, unclassified), any previously indexed
 * entry is purged so stale text doesn't linger in the vector store.
 */
export const ingestSession = internalAction({
	args: { sessionId: v.id("sessions") },
	handler: async (ctx, args) => {
		const source = await ctx.runQuery(
			internal.episodicMemory.getSessionForEpisodic,
			{ sessionId: args.sessionId }
		);

		if (!source) {
			// We don't know the owner namespace from a deleted session; the
			// retention/wipe jobs handle that path with the profile id in hand.
			// This purge covers the burned/unclassified cases.
			return;
		}

		if (!(source.metadataOnly || source.rawInput || source.mirrorText)) {
			return;
		}

		await rag.add(ctx, {
			// All three declared filters are required on every add (see rag.ts).
			// status is inert here — personal memory search never filters on it.
			filterValues: [
				{ name: "primaryEmotion", value: source.primaryEmotion },
				{
					name: "granularLabel",
					value: source.granularLabel ?? NO_GRANULAR_LABEL,
				},
				{ name: "status", value: EPISODIC_STATUS },
			],
			// Learned salience (Loop #3). Default 1 until feedback moves it; passed
			// on every (re-)ingest so a re-embed never resets an adjusted weight.
			importance: source.importance,
			key: args.sessionId,
			namespace: source.emotionalProfileId,
			text: buildComposite(source),
		});
	},
});

/**
 * Phase 4, Loop #3 — apply confirmation feedback to the episodic memories
 * that informed a mirror. For each matched memory: nudge its stored weight
 * (cheap, transactional) and, only if it actually moved, re-embed so the new
 * importance reaches the RAG vector. Runs OFF the hot path (scheduled from
 * confirmMirror) — the user's confirmation tap never waits on an embed.
 *
 * @convex-dev/rag has no in-place importance setter, so "apply the weight"
 * IS a re-ingest (ingestSession re-checks eligibility and re-embeds with the
 * new weight). K is small (≈3 matches), so the cost is bounded per landing.
 */
export const applyMemoryFeedback = internalAction({
	args: {
		feedback: v.union(
			v.literal("confirmed"),
			v.literal("refined"),
			v.literal("gave_up"),
			v.literal("abandoned")
		),
		matchedKeys: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const feedback = args.feedback as MemoryFeedback;
		// Neutral states never move a weight — nothing to schedule.
		if (!isActionableFeedback(feedback)) {
			return;
		}

		for (const key of args.matchedKeys) {
			// Keys are episodic RAG keys, which are sessionIds by construction.
			const sessionId = key as Id<"sessions">;
			// Isolate each memory: a failure on one (adjust or re-embed) must not
			// block feedback from landing on the remaining matched memories.
			try {
				const { changed } = await ctx.runMutation(
					internal.emotionalMetadata.adjustEpisodicImportance,
					{ feedback, sessionId }
				);
				// Only pay the re-embed when the weight actually changed (skips no-ops
				// and memories already clamped at a floor/ceiling).
				if (changed) {
					await ctx.runAction(internal.episodicMemory.ingestSession, {
						sessionId,
					});
				}
			} catch (error) {
				console.error(
					`[applyMemoryFeedback] failed for session ${sessionId}:`,
					error
				);
			}
		}
	},
});

/**
 * Purge one session's episodic entry. Callable from MUTATIONS — this is
 * what keeps wipe parity inside the same transaction path that deletes
 * the session row (dataRetention / dataWipe / accountDeletion).
 * No-op if the profile never had a namespace.
 */
export async function purgeEpisodicEntry(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	sessionId: Id<"sessions">
): Promise<void> {
	await purgeEpisodicEntries(ctx, emotionalProfileId, [sessionId]);
}

/** Batch variant — resolves the namespace once per profile. */
export async function purgeEpisodicEntries(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	sessionIds: Id<"sessions">[]
): Promise<void> {
	if (sessionIds.length === 0) {
		return;
	}
	const namespace = await rag.getNamespace(ctx, {
		namespace: emotionalProfileId,
	});
	if (!namespace) {
		return;
	}
	for (const sessionId of sessionIds) {
		await rag.deleteByKeyAsync(ctx, {
			key: sessionId,
			namespaceId: namespace.namespaceId,
		});
	}
}

// =============================================================
// REPLY ENTRIES — the second episodic key class (ADR 0007).
//
// A reply to a daily quote lands in the SAME personal namespace,
// keyed `reply:<quoteId>` and tagged `status: REPLY_STATUS`. The
// tag is the whole mechanism: searchEpisodicMemory filters the
// mirror down to EPISODIC_STATUS and therefore never retrieves a
// reply, while the semantic-profile agent's unfiltered search does.
//
// The `reply:` prefix is what keeps applyMemoryFeedback's
// `key as Id<"sessions">` cast honest — a violation is wrong on
// inspection, not at runtime.
// =============================================================

/**
 * Every episodic key class and the purge helper that owns it. Wipe parity
 * is an absolute invariant here, so `lib/sessionCascade.test.ts` asserts each
 * helper below actually has a call-site in a deletion job — adding a class
 * without wiring its purge fails the suite instead of quietly letting an
 * embedding outlive the account that wrote it.
 */
export const EPISODIC_PURGE_HELPERS = {
	reply: "purgeReplyEntries",
	session: "purgeEpisodicEntries",
} as const;

/** RAG key for a reply entry — prefixed, never a bare id. */
function replyKey(quoteId: Id<"daily_quotes">): string {
	return `reply:${quoteId}`;
}

/**
 * The composite for one reply, or null when it must not be in memory
 * (cleared, moderation-flagged, or personal memory off). Null still carries
 * the namespace, because "not in memory" has to be able to purge.
 */
export const getReplyForEpisodic = internalQuery({
	args: { quoteId: v.id("daily_quotes") },
	handler: async (
		ctx,
		args
	): Promise<{
		emotionalProfileId: Id<"emotional_profiles">;
		composite: string | null;
	} | null> => {
		const quote = await ctx.db.get("daily_quotes", args.quoteId);
		if (!quote) {
			return null;
		}
		const emotionalProfileId = quote.emotionalProfileId;

		// A reply edited down to nothing purges.
		const reply = quote.reply?.trim();
		if (!reply) {
			return { composite: null, emotionalProfileId };
		}

		// Parity with the quote prompt: a flagged reply is kept as the person's
		// words but never fed anywhere. `unavailable` is not a clean verdict
		// either, so it is treated the same (quotesDistiller does likewise).
		const moderation = quote.replyModeration;
		if (moderation?.flagged || moderation?.unavailable) {
			return { composite: null, emotionalProfileId };
		}

		const preferences = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", emotionalProfileId)
			)
			.unique();
		// Memory off means not embedded AT ALL — no degraded metadata-only line
		// like a session gets, because a reply *is* its text. It still reaches
		// tomorrow's quote (ADR 0006 is unchanged); the two paths diverge here.
		if (preferences?.personalMemoryEnabled === false) {
			return { composite: null, emotionalProfileId };
		}

		// One-line provenance label, then the reply. The quote text is NOT here:
		// it is model-authored and on a short reply would dominate the embedding,
		// matching on the quote's themes instead of the person's words. Bare text
		// is equally wrong — the profile agent writes narrative claims from opaque
		// composites and would report a reply as a reflection.
		return {
			composite: `reply to a daily thought (${quote.date})\n\n${reply}`,
			emotionalProfileId,
		};
	},
});

/**
 * Embed one reply into its owner's personal namespace, or purge it when it
 * no longer belongs there. Idempotent on the key, so an edit replaces.
 *
 * Free and premium are identical: the semantic profile is not a feature you
 * receive. Reach is lagged by design — consolidation fires from session
 * completion, so the reply is seen at the next completed reflection.
 */
export const ingestReply = internalAction({
	args: { quoteId: v.id("daily_quotes") },
	handler: async (ctx, args) => {
		const source = await ctx.runQuery(
			internal.episodicMemory.getReplyForEpisodic,
			{ quoteId: args.quoteId }
		);
		// Row is gone — the wipe/deletion loops purge with the profile id in hand.
		if (!source) {
			return;
		}

		if (source.composite === null) {
			await purgeReplyEntries(ctx, source.emotionalProfileId, [args.quoteId]);
			return;
		}

		await rag.add(ctx, {
			// All three declared filters are required on every add (see rag.ts).
			filterValues: [
				{ name: "primaryEmotion", value: NO_PRIMARY_EMOTION },
				{ name: "granularLabel", value: NO_GRANULAR_LABEL },
				{ name: "status", value: REPLY_STATUS },
			],
			// Seeded, never earned (see REPLY_IMPORTANCE).
			importance: REPLY_IMPORTANCE,
			key: replyKey(args.quoteId),
			namespace: source.emotionalProfileId,
			text: source.composite,
		});
	},
});

/**
 * Purge a batch of replies' episodic entries. Called from the SAME loops that
 * delete `daily_quotes` rows (jobs/dataWipe, jobs/accountDeletionSteps) —
 * those loops touch no vector on their own, so this is the only thing keeping
 * a reply embedding from outliving the account.
 */
export async function purgeReplyEntries(
	ctx: MutationCtx | ActionCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	quoteIds: Id<"daily_quotes">[]
): Promise<void> {
	if (quoteIds.length === 0) {
		return;
	}
	const namespace = await rag.getNamespace(ctx, {
		namespace: emotionalProfileId,
	});
	if (!namespace) {
		return;
	}
	for (const quoteId of quoteIds) {
		await rag.deleteByKeyAsync(ctx, {
			key: replyKey(quoteId),
			namespaceId: namespace.namespaceId,
		});
	}
}

/** One page of quotes per purge step (see purgeAllRepliesForProfile). */
const REPLY_PURGE_BATCH = 100;

/**
 * Purge EVERY reply embedding for one profile — the personal-memory opt-out
 * transition. `getReplyForEpisodic` only stops future ingestion; the replies
 * already embedded have to come back out, or "off" is retroactively a lie.
 * The `daily_quotes` rows themselves stay: this is a memory opt-out, not a
 * wipe (that is jobs/dataWipe) and not a deletion (jobs/accountDeletionSteps).
 */
export const purgeAllRepliesForProfile = internalMutation({
	args: {
		cursor: v.optional(v.union(v.string(), v.null())),
		emotionalProfileId: v.id("emotional_profiles"),
	},
	handler: async (ctx, args) => {
		const page = await ctx.db
			.query("daily_quotes")
			.withIndex("by_profile_date", (q) =>
				q.eq("emotionalProfileId", args.emotionalProfileId)
			)
			.paginate({ cursor: args.cursor ?? null, numItems: REPLY_PURGE_BATCH });

		// Only replied rows ever had a key; the rest are a no-op by construction.
		await purgeReplyEntries(
			ctx,
			args.emotionalProfileId,
			page.page.filter((q) => q.reply !== undefined).map((q) => q._id)
		);

		if (!page.isDone) {
			await ctx.scheduler.runAfter(
				0,
				internal.episodicMemory.purgeAllRepliesForProfile,
				{
					cursor: page.continueCursor,
					emotionalProfileId: args.emotionalProfileId,
				}
			);
		}
	},
});

// =============================================================
// Backfill — one-shot migration over past sessions.
// Run once: `bunx convex run episodicMemory:backfill '{}'`
// =============================================================

/** One page of session ids for the backfill walk. */
export const listSessionsForBackfill = internalQuery({
	args: { paginationOpts: paginationOptsValidator },
	handler: async (ctx, args) => {
		const page = await ctx.db
			.query("sessions")
			.withIndex("by_date")
			.paginate(args.paginationOpts);
		return {
			continueCursor: page.continueCursor,
			ids: page.page.map((s) => s._id),
			isDone: page.isDone,
		};
	},
});

/**
 * Self-rescheduling backfill of all existing sessions. ingestSession
 * itself decides eligibility (burned / unclassified / crisis /
 * toggle-off), so this walk is a plain sweep.
 */
export const backfill = internalAction({
	args: { cursor: v.optional(v.union(v.string(), v.null())) },
	handler: async (ctx, args) => {
		const page = await ctx.runQuery(
			internal.episodicMemory.listSessionsForBackfill,
			{ paginationOpts: { cursor: args.cursor ?? null, numItems: 25 } }
		);

		for (const sessionId of page.ids) {
			await ctx.runAction(internal.episodicMemory.ingestSession, {
				sessionId,
			});
		}

		if (!page.isDone) {
			await ctx.scheduler.runAfter(0, internal.episodicMemory.backfill, {
				cursor: page.continueCursor,
			});
		}
	},
});

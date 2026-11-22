import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import type { NotOwn } from "./reflectionAuthor";
import { emotionFamily } from "./understandingVocab";

// =============================================================
// Peer-reflection matching helpers for reflections.matchForSession.
// The handler stays a thin orchestrator: semantic (Xolace+) first,
// topped up from the tag cascade to four results.
//
// Every helper takes `notOwn` (lib/reflectionAuthor.notContributedBy) and
// drops the viewer's own reflections while reading, so a contributor is
// never shown theirs and own rows never use up a read's quota.
// =============================================================

type Reflection = Doc<"reflections">;

/** Own rows one read may skip past before it stops; keeps every read bounded. */
const OWN_ROWS_SKIPPED_MAX = 50;

/** Read up to `n` rows that pass `notOwn`, in the query's order. */
export async function takeKept(
	rows: AsyncIterable<Reflection>,
	n: number,
	notOwn: NotOwn
): Promise<Reflection[]> {
	const kept: Reflection[] = [];
	if (n <= 0) {
		return kept;
	}
	let skipped = 0;
	for await (const r of rows) {
		if (notOwn(r)) {
			kept.push(r);
			if (kept.length >= n) {
				break;
			}
		} else {
			skipped++;
			if (skipped >= OWN_ROWS_SKIPPED_MAX) {
				break;
			}
		}
	}
	return kept;
}

/**
 * Resolve a session's precomputed semantic match ids to live docs,
 * dropping rows that were deleted or are no longer active. Returns []
 * when nothing was precomputed (embed not ready yet / failed).
 */
export async function loadSemanticMatches(
	ctx: QueryCtx,
	session: Doc<"sessions">,
	notOwn: NotOwn
): Promise<Reflection[]> {
	if (!session.semanticMatchIds?.length) {
		return [];
	}
	const docs = await Promise.all(
		session.semanticMatchIds.map((id) => ctx.db.get("reflections", id))
	);
	// Ids precomputed before #790 may still name the viewer's own.
	return docs.filter(
		(r): r is Reflection => r !== null && r.status === "active" && notOwn(r)
	);
}

/** Rows each cascade step reads, after own rows are dropped. */
const CASCADE_READ = 10;

/**
 * Tag-cascade matching: granular label first, broadened to the primary
 * emotion when thin, then filtered by intensity proximity (±3). Returns
 * the filtered candidates unsliced; the caller caps the final count.
 */
export async function matchByTags(
	ctx: QueryCtx,
	sessionId: Doc<"sessions">["_id"],
	notOwn: NotOwn
): Promise<Reflection[]> {
	const metadata = await ctx.db
		.query("emotional_metadata")
		.withIndex("by_session", (q) => q.eq("sessionId", sessionId))
		.unique();

	if (!metadata) {
		return [];
	}

	// Try granular match first
	const reflections = await takeKept(
		ctx.db
			.query("reflections")
			.withIndex("by_granular", (q) =>
				q
					.eq("granularLabel", metadata.granularLabel ?? undefined)
					.eq("status", "active")
			),
		CASCADE_READ,
		notOwn
	);

	// Fall back to broad emotion match. A finer primary ("loneliness") also
	// matches older rows that carried it as a granular label, then its parent
	// ("sadness") — the pool predates the finer vocabulary (ADR 0018).
	if (reflections.length < 3) {
		const [emotion, ...parents] = emotionFamily(metadata.primaryEmotion);
		const broadMatches = [
			...(await takeKept(
				ctx.db
					.query("reflections")
					.withIndex("by_emotion", (q) =>
						q.eq("primaryEmotion", emotion).eq("status", "active")
					),
				CASCADE_READ,
				notOwn
			)),
			...(parents.length > 0
				? await takeKept(
						ctx.db
							.query("reflections")
							.withIndex("by_granular", (q) =>
								q.eq("granularLabel", emotion).eq("status", "active")
							),
						CASCADE_READ,
						notOwn
					)
				: []),
		];
		for (const parent of parents) {
			broadMatches.push(
				...(await takeKept(
					ctx.db
						.query("reflections")
						.withIndex("by_emotion", (q) =>
							q.eq("primaryEmotion", parent).eq("status", "active")
						),
					CASCADE_READ,
					notOwn
				))
			);
		}

		// Merge without duplicates
		const existingIds = new Set(reflections.map((r) => r._id));
		for (const match of broadMatches) {
			if (!existingIds.has(match._id)) {
				existingIds.add(match._id);
				reflections.push(match);
			}
		}
	}

	// Filter by intensity proximity (within ±3 of session intensity)
	return reflections.filter(
		(r) => Math.abs(r.intensity - metadata.intensity) <= 3
	);
}

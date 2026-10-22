// =============================================================
// CLAIM STRENGTH ROUTING — Cognition Layer Phase 4, Loop #2.
//
// System 1 (the hot path) stays deterministic forever (decision-log #8):
// this is rule-code, never a model call. It decides how strongly the mirror
// may claim tonight's read — and, when there isn't enough signal to earn a
// read at all, that it should say so instead of asserting one.
//
//   reaching  → the gate fired and no reach has gone out on this session:
//               name what is present, then say plainly that what it attaches
//               to is not in the words yet.
//   holding   → the reach already went out and the signal is still faint, or
//               the session hit the cap having reached.
//   measured  → the normal path.
//   confident → high confidence AND high shape: full precision, no hedging.
//
// The gate (docs/confidence-aware-mirroring.md §3) is:
//
//   reach = specificity <= 2 && !memoryConnected && eligibleEntryType
//        && !isEscalation && !profileAlreadyReachedToday
//
// `confidence` is deliberately NOT in the conjunct (§3.2): the classifier's
// self-reported confidence is a discrete menu, so any threshold there is a
// tripwire a prompt revision can trip. It is kept only on the `confident`
// pole, which works.
//
// Claim strength is never persisted — it is a pure function of the
// Understanding plus session state, so it is re-derived wherever needed.
// =============================================================

export type ClaimStrength = "reaching" | "holding" | "measured" | "confident";

/**
 * Episodic score at or above which memory counts as having connected.
 * Provisional (§10) — the raw score is persisted and claim strength derived
 * at read time, so retuning this is a one-constant edit with no backfill.
 */
export const EPISODIC_CONNECT_FLOOR = 0.35;

// primaryEmotionConfidence is 0-1; specificity is the classifier's 0-10 scale.
// HIGH_SPECIFICITY mirrors the articulator's own highSpecificity cutoff (6).
// LOW_SPECIFICITY is exclusive — the gate considers sp <= 2 (§3.3).
const HIGH_CONFIDENCE = 0.75;
const LOW_SPECIFICITY = 3;
const HIGH_SPECIFICITY = 6;

/**
 * `body_scan` is excluded on purpose (§3.5): a tapped body area is low
 * bandwidth by choice, so faintness is the format, not a gap in what they gave.
 *
 * `word_cloud` WAS excluded on the same reasoning and no longer is (§3.5,
 * reversed 2026-09-04). Texture words are still low bandwidth, but "the mirror
 * cannot see what this attaches to" was true of those sessions too, and
 * suppression meant they got a confident-sounding read instead of a question.
 * The known cost is volume: word-cloud specificity sits at `sp <= 2` almost
 * always, so the gate collapses to `!memoryConnected` and the reach becomes
 * the ordinary word-cloud experience. The same-day guard (§3.7) is what bounds
 * it. This is one set literal — revert it if the data says to.
 *
 * `talk` is excluded (#592): a reach asks for a typed clarify, and a talk has
 * none — its "Say more" reopens the talk (#604), where the companion asks.
 */
const REACH_ELIGIBLE_ENTRY_TYPES = new Set([
	"open_prompt",
	"guided_entry",
	"voice",
	"word_cloud",
]);

export interface ClaimStrengthSignal {
	/** turnsCount >= MAX_TURNS. */
	atCap: boolean;
	/** primaryEmotionConfidence, 0-1. */
	confidence: number;
	entryType: string;
	/**
	 * Highest episodic search score as returned by rag.search. Absent = no
	 * search ran (cold start) or nothing retrieved — NOT zero (§3.4).
	 */
	episodicTopScore?: number;
	/** A reach already went out on THIS session. */
	gapNamedThisSession: boolean;
	/** SafeguardResult.isEscalation — the same flag that replaces the mirror screen. */
	isEscalation: boolean;
	/**
	 * Another session by this profile already reached today (indexed read).
	 * Ignored once this session itself has reached — see routeClaimStrength.
	 */
	profileReachedToday: boolean;
	/** classifier specificity, 0-10. */
	specificity: number;
	userFeedback?: string;
}

/**
 * The single gate. Both derivation sites (decideMirrorOutcome and clarify)
 * route through here with full context — one guard, not one guard per caller.
 * Resolution order is §3.9 of the doc, in order.
 */
export function routeClaimStrength(input: ClaimStrengthSignal): ClaimStrength {
	// 1. Suppressed sessions are plain — never reaching, never holding, on any
	//    turn including the cap (§3.8).
	// The same-day guard binds a whole session including its refinement turns:
	// a session that already reached is not re-suppressed by a SIBLING session
	// reaching between turns, or turn 2 would go plain where it must hold.
	const suppressed =
		!REACH_ELIGIBLE_ENTRY_TYPES.has(input.entryType) ||
		input.isEscalation ||
		(input.profileReachedToday && !input.gapNamedThisSession);

	if (!suppressed) {
		// 2. At the cap, a session that reached stops reaching and holds.
		if (input.atCap && input.gapNamedThisSession) {
			return "holding";
		}

		// 3. The gate itself. A NEW reach never opens at the cap: "Say more"
		// never renders there (§6), so a question with no way to answer it is a
		// dead end, not a reach. A session that already reached still holds;
		// one that never reached falls through to the normal poles and answers
		// with its best read instead of a question nobody can respond to.
		const memoryConnected =
			input.episodicTopScore !== undefined &&
			input.episodicTopScore >= EPISODIC_CONNECT_FLOOR;
		if (input.specificity < LOW_SPECIFICITY && !memoryConnected) {
			if (input.gapNamedThisSession) {
				return "holding";
			}
			if (!input.atCap) {
				return "reaching";
			}
		}
	}

	// 5. The normal poles.
	const base =
		input.confidence >= HIGH_CONFIDENCE && input.specificity >= HIGH_SPECIFICITY
			? "confident"
			: "measured";

	// 6. Floor: a "not quite" is empirical proof the read missed, so never carry
	//    a confident posture into a rejected turn. "say_more" adds context
	//    without rejecting, so it stands.
	return input.userFeedback === "not_quite" && base === "confident"
		? "measured"
		: base;
}

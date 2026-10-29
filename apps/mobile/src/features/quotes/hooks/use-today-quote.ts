import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import type { OptimisticLocalStore } from "convex/browser";
import { useAction, useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { useQuoteNotifications } from "@/features/quotes/hooks/use-quote-notifications";

/** Line above the quote; doubles as the Xolace+ gate. A locked user sees the curated quote and
 * is withheld only provenance (#309). */
export type SourceLine = { text: string; isGate: boolean };

/** Optimistic star patch on `getToday`. The archive passes `countDelta`: a past day's row is
 * neither of today's quotes. */
export function patchSaved(
	store: OptimisticLocalStore,
	quoteId: Id<"daily_quotes">,
	saved: boolean,
	countDelta?: number
) {
	const current = store.getQuery(api.dailyQuotes.getToday, {});
	if (current === undefined) {
		return;
	}

	const savedAt = saved ? Date.now() : undefined;

	const wasSaved = [current.session, current.curated].some(
		(q) => q?._id === quoteId && q.savedAt !== undefined
	);
	const delta = countDelta ?? (saved ? (wasSaved ? 0 : 1) : wasSaved ? -1 : 0);

	const patch = <T extends { _id: Id<"daily_quotes"> } | null>(quote: T) =>
		quote && quote._id === quoteId ? { ...quote, savedAt } : quote;

	store.setQuery(
		api.dailyQuotes.getToday,
		{},
		{
			...current,
			curated: patch(current.curated),
			savedCount: Math.max(0, current.savedCount + delta),
			session: patch(current.session),
		}
	);
}

/** Today's quote, its derived source line and the cold-start / first-visit machinery. */
export function useTodayQuote() {
	const posthog = usePostHog();

	const todayQuotes = useQuery(api.dailyQuotes.getToday);
	const quotePrefs = useQuery(api.preferences.getQuotePreferences);
	const coldStart = useAction(api.dailyQuotes.coldStart);
	const reactToQuote = useMutation(api.dailyQuotes.react);
	const clearReaction = useMutation(api.dailyQuotes.clearReaction);
	const replyToQuote = useAction(api.dailyQuotes.reply);
	const saveQuote = useMutation(api.dailyQuotes.save).withOptimisticUpdate(
		(store, args) => patchSaved(store, args.quoteId, true)
	);
	const unsaveQuote = useMutation(api.dailyQuotes.unsave).withOptimisticUpdate(
		(store, args) => patchSaved(store, args.quoteId, false)
	);
	const { state: notifState, scheduleNotification } = useQuoteNotifications();

	const [isManualColdStarting, setIsManualColdStarting] = useState(false);
	const [isSendingReply, setIsSendingReply] = useState(false);
	const [coldStartError, setColdStartError] = useState(false);
	const viewedTrackedRef = useRef(false);
	const gateViewedTrackedRef = useRef(false);

	// One cold start per mount. Reset only on explicit retry, never on the error
	// path, or a failing action re-arms the effect and loops.
	const coldStartIssuedRef = useRef(false);

	const isLoading = todayQuotes === undefined || quotePrefs === undefined;
	const quote = todayQuotes?.session ?? todayQuotes?.curated ?? null;
	const sessionLocked = todayQuotes?.sessionLocked ?? false;
	const isFirstVisit = !isLoading && quotePrefs === null;
	const needsColdStart =
		!(isLoading || isFirstVisit) &&
		quote === null &&
		!isManualColdStarting &&
		!coldStartError;
	const isColdStarting = isManualColdStarting || needsColdStart;

	const sourceLine: SourceLine | null = quote
		? sessionLocked
			? { isGate: true, text: "This one's for everyone. Yours is waiting →" }
			: quote.type === "session"
				? { isGate: false, text: "based on what you've been sharing." }
				: todayQuotes?.hasSessionToday === false
					? { isGate: false, text: "reflect today and tomorrow's is yours." }
					: { isGate: false, text: "chosen for you today." }
		: null;

	useEffect(() => {
		if (!needsColdStart || coldStartIssuedRef.current) {
			return;
		}
		coldStartIssuedRef.current = true;
		coldStart().catch((e) => {
			console.error(e);
			setColdStartError(true);
		});
	}, [needsColdStart, coldStart]);

	useEffect(() => {
		if (viewedTrackedRef.current || isFirstVisit || isLoading || !quote) {
			return;
		}
		viewedTrackedRef.current = true;
		posthog.capture("quote_viewed", {
			has_session_today: todayQuotes?.hasSessionToday ?? false,
			quote_type: quote.type,
		});
	}, [isFirstVisit, isLoading, quote, todayQuotes?.hasSessionToday, posthog]);

	useEffect(() => {
		if (gateViewedTrackedRef.current || isLoading || !sessionLocked) {
			return;
		}
		gateViewedTrackedRef.current = true;
		posthog.capture("premium_gate_hit", {
			feature: "daily_quote",
			hasData: true,
		});
	}, [isLoading, sessionLocked, posthog]);

	const runColdStart = async () => {
		if (coldStartIssuedRef.current) {
			return;
		}
		coldStartIssuedRef.current = true;
		setIsManualColdStarting(true);
		await coldStart()
			.catch((e) => {
				console.error(e);
				setColdStartError(true);
			})
			.finally(() => setIsManualColdStarting(false));
	};

	const retry = () => {
		setColdStartError(false);
		coldStartIssuedRef.current = false;
		void runColdStart();
	};

	const completePreferences = async (
		themes: string[],
		notifEnabled: boolean,
		notifTime?: string
	) => {
		posthog.capture("quote_preferences_set", {
			notification_time: notifTime ?? null,
			notifications_enabled: notifEnabled,
			theme_count: themes.length,
			themes,
		});
		await scheduleNotification(themes, notifEnabled, notifTime);
		setColdStartError(false);
		await runColdStart();
	};

	// `not_today` is gone from the UI (#303); resonate toggles to null. Returns
	// whether the write landed (callers fire it with `void`); the event is
	// captured only after the round trip.
	const setReaction = async (next: "resonates" | null) => {
		if (!quote) {
			return false;
		}
		try {
			if (next) {
				await reactToQuote({ quoteId: quote._id, reaction: next });
				posthog.capture("quote_reacted", {
					quote_type: quote.type,
					reaction: next,
				});
			} else {
				const previous = quote.reaction ?? null;
				await clearReaction({ quoteId: quote._id });
				posthog.capture("quote_reaction_cleared", {
					previous_reaction: previous,
					quote_type: quote.type,
				});
			}
			return true;
		} catch (e) {
			console.error("[quotes] reaction failed", e);
			return false;
		}
	};

	// The star is optimistic, so a rejection un-fills it silently; capture the
	// event only once the write landed.
	const setSaved = async (next: boolean) => {
		if (!quote) {
			return;
		}
		try {
			await (next
				? saveQuote({ quoteId: quote._id })
				: unsaveQuote({ quoteId: quote._id }));
			posthog.capture(next ? "quote_saved" : "quote_unsaved", {
				quote_type: quote.type,
			});
		} catch (e) {
			console.error("[quotes] save toggle failed", e);
		}
	};

	// The action moderates before it stores, so no optimistic patch: the panel
	// keeps the text until it lands, and a flagged reply comes back saying so.
	const sendReply = async (text: string) => {
		if (!quote) {
			return;
		}
		setIsSendingReply(true);
		try {
			const { flagged } = await replyToQuote({ quoteId: quote._id, text });
			posthog.capture("quote_replied", {
				flagged,
				is_edit: quote.reply !== undefined,
				length: text.length,
				quote_type: quote.type,
			});
		} catch (e) {
			console.error("[quotes] reply failed", e);
			throw e;
		} finally {
			setIsSendingReply(false);
		}
	};

	return {
		coldStartError,
		completePreferences,
		isColdStarting,
		isCompletingPreferences: notifState === "requesting" || isColdStarting,
		isFirstVisit,
		isLoading,
		isSendingReply,
		quote,
		react: setReaction,
		/** Premium and session-in-window: what makes the reach sub-line true. */
		replyReaches: todayQuotes?.replyReaches ?? false,
		/** Personal memory on: the reply also lands in the semantic profile. */
		replyRemembered: todayQuotes?.replyRemembered ?? false,
		retry,
		savedCount: todayQuotes?.savedCount ?? 0,
		/** Keeping quotes is Xolace+ (#317). Locked while loading so a cold tap never writes. */
		saveLocked: todayQuotes?.saveLocked ?? true,
		sendReply,
		setSaved,
		sourceLine,
	};
}

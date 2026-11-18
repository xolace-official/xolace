import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { useSessionMode } from "@/context/session-mode-context";
import { usePaywall } from "@/features/purchases/use-paywall";
import { useAppStore } from "@/store/store";
import { useFollowUpAsk } from "./follow-up/follow-up-ask";
import { followUpBucket } from "./mood-scale";
import type { SessionEnd } from "./session-end-data";
import {
	dayOf,
	fromOf,
	type NextKey,
	pitchDismissed,
	type SavedMood,
	type SessionPath,
	wordsToShare,
} from "./session-end-model";
import { useNextStep } from "./use-next-step";

/** Past this, the arrival starts with whatever is in (offline: no words, no day chip). */
const READY_WAIT_MS = 4000;

/** The pitch's offer events: kindling's own slot, not one of the session close's moments. */
const PITCH_EVENT = { moment: null, surface: "kindling", variant: "default" };

/** What this visit saved, for `session_completed` on the way out. */
type Saved = { mood: SavedMood | null; contributed: boolean | null };

/**
 * The session end on Convex: the completed session (read by id: `getActive` is
 * null by now), the streak, the next step, and the saves. Saving is
 * best-effort enrichment, never awaited before moving on: the session is
 * already complete, so a failed save loses only the answer.
 */
export function useSessionEndData({
	path,
	sessionId,
}: {
	path: SessionPath;
	sessionId: Id<"sessions"> | null;
}): SessionEnd {
	const router = useRouter();
	const posthog = usePostHog();
	const { isNight } = useSessionMode();
	const session = useQuery(
		api.sessions.getById,
		sessionId ? { sessionId } : "skip"
	);
	const summary = useQuery(api.profile.getSummary);
	const canAsk = useQuery(api.feedback.canAskContextual);
	const record = useMutation(api.sessions.recordPostSessionFeedback);
	const markUnlockSeen = useMutation(api.compounding.unlocks.markSeen);
	const next = useNextStep(sessionId);
	const openPaywall = usePaywall((s) => s.open);
	const setPendingEventPrompt = useAppStore((s) => s.setPendingEventPrompt);
	const recordPlusOfferShown = useAppStore((s) => s.recordPlusOfferShown);
	const recordPlusOfferDismissal = useAppStore(
		(s) => s.recordPlusOfferDismissal
	);
	const saved = useRef<Saved>({ contributed: null, mood: null });
	const left = useRef(false);

	// No session, or one that isn't this user's: nothing to end here.
	const missing = sessionId === null || session === null;
	useEffect(() => {
		if (missing && !left.current) {
			left.current = true;
			router.dismissTo("/today");
		}
	}, [missing, router]);

	// Deliberate: no unlock beat shows here any more. An unlock that earned an area badge is marked
	// seen as the session end opens (`whenBadged`): Badges' arrival announces it, so tomorrow's
	// "you missed it" push would repeat it. Any other unlock (no badge for the 2nd area, or the 4th
	// to 7th) stays unseen, and the push is how the person hears of it.
	const unseenUnlock =
		session?.domainUnlock !== undefined &&
		session.domainUnlock.seenAt === undefined;
	useEffect(() => {
		if (sessionId && unseenUnlock) {
			markUnlockSeen({ sessionId, whenBadged: true }).catch(() => undefined);
		}
	}, [sessionId, unseenUnlock, markUnlockSeen]);

	const save = (feedback: {
		contributedReflection?: boolean;
		postSessionMood?: SavedMood["postSessionMood"];
		moodPosition?: number;
	}) => {
		if (sessionId) {
			record({ sessionId, ...feedback }).catch(() => undefined);
		}
	};

	const completed = useRef(false);
	/** `session_completed`, once, with what this visit saved and how it went on. */
	const complete = (exit: Record<string, string | boolean>) => {
		if (completed.current) {
			return;
		}
		completed.current = true;
		posthog.capture("session_completed", {
			...exit,
			contributed_reflection: saved.current.contributed,
			mood_position: saved.current.mood?.moodPosition ?? null,
			post_session_mood: saved.current.mood?.postSessionMood ?? null,
		});
	};

	/** The next step shown, and whether it was taken (a pitch left untaken is a "no"). */
	const shown = useRef<{ key: NextKey | null; taken: boolean }>({
		key: null,
		taken: false,
	});

	/** Leaves the screen once; `navigate` goes on from there. */
	const leave = (
		exit: Record<string, string | boolean>,
		navigate: () => void
	) => {
		if (left.current) {
			return;
		}
		left.current = true;
		setPendingEventPrompt(null);
		if (pitchDismissed(shown.current.key, shown.current.taken)) {
			recordPlusOfferDismissal("session_close");
			posthog.capture("plus_offer_dismissed", PITCH_EVENT);
		}
		complete(exit);
		navigate();
	};

	// Structural only: a user's themes must not be reconstructable from analytics.
	const variant = path === "exit" ? "exit" : "activity";

	const nextShown = (key: NextKey) => {
		shown.current = { key, taken: false };
		if (key === "kfree") {
			// The pitch spends this session's offer: the next session won't show one.
			recordPlusOfferShown(sessionId);
			posthog.capture("plus_offer_shown", PITCH_EVENT);
			posthog.capture("plus_upsell_shown", { surface: "kindling" });
		} else if (key === "listener") {
			posthog.capture("xolacer_suggestion_shown", { variant });
		}
	};

	const openNext = (key: NextKey) => {
		shown.current.taken = true;
		const profile = next.listener.profile;
		if (key === "listener" && profile) {
			posthog.capture("xolacer_suggestion_opened", { variant });
			complete({ action: "open_listener" });
			router.push({ params: profile, pathname: "/xolacer/[profileId]" });
		} else if (key === "kindling") {
			complete({ action: "open_kindling", kindling_ready: true });
			router.push("/kindling");
		} else if (key === "kindlingSettingUp") {
			leave({ action: "open_kindling", kindling_ready: false }, () =>
				router.dismissTo("/today")
			);
		} else if (key === "kfree") {
			posthog.capture("plus_upsell_tapped", { surface: "kindling" });
			complete({ action: "open_paywall" });
			openPaywall("kindling", sessionId ? { sessionId } : undefined);
		}
	};

	const [waited, setWaited] = useState(false);
	useEffect(() => {
		const timer = setTimeout(() => setWaited(true), READY_WAIT_MS);
		return () => clearTimeout(timer);
	}, []);
	const ready = (session !== undefined && summary !== undefined) || waited;
	return {
		actions: {
			another: () =>
				leave({ action: "have_more" }, () => router.dismissTo("/reflect")),
			askFollowUp: (step, onClosed) => {
				useFollowUpAsk
					.getState()
					.open({ bucket: followUpBucket(step), onClosed, sessionId });
				router.push("/session-follow-up");
			},
			done: () =>
				leave({ action: "dismiss" }, () => router.dismissTo("/today")),
			nextShown,
			openNext,
			saveMood: (mood) => {
				saved.current.mood = mood;
				save(mood);
			},
			share: (contributed) => {
				saved.current.contributed = contributed;
				save({ contributedReflection: contributed });
			},
		},
		state: {
			canAskFollowUp: canAsk === true,
			// Whether today had counted before this session isn't served yet: no roll.
			day: summary ? dayOf(summary.currentStreak, null) : null,
			from: fromOf(path),
			late: isNight,
			listener: next.listener.card,
			ready,
			slot: next.slot,
			words: wordsToShare(path, session?.distilledText),
		},
	};
}

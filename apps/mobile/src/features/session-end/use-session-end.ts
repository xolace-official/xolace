import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
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
	type SavedMood,
	type SessionPath,
	wordsToShare,
} from "./session-end-model";
import { useNextStep } from "./use-next-step";

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
	const next = useNextStep(sessionId);
	const openPaywall = usePaywall((s) => s.open);
	const setPendingEventPrompt = useAppStore((s) => s.setPendingEventPrompt);
	const recordPlusOfferShown = useAppStore((s) => s.recordPlusOfferShown);
	const saved = useRef<Saved>({ contributed: null, mood: null });
	const left = useRef(false);

	// No session, or one that isn't this user's: nothing to end here.
	const missing = sessionId === null || session === null;
	useEffect(() => {
		if (missing && !left.current) {
			left.current = true;
			router.dismissTo("/");
		}
	}, [missing, router]);

	const save = (feedback: {
		contributedReflection?: boolean;
		postSessionMood?: SavedMood["postSessionMood"];
		moodPosition?: number;
	}) => {
		if (sessionId) {
			record({ sessionId, ...feedback }).catch(() => undefined);
		}
	};

	/** Leaves the screen once, with what it saved; `navigate` goes on from there. */
	const leave = (
		exit: Record<string, string | boolean>,
		navigate: () => void
	) => {
		if (left.current) {
			return;
		}
		left.current = true;
		setPendingEventPrompt(null);
		posthog.capture("session_completed", {
			...exit,
			contributed_reflection: saved.current.contributed,
			mood_position: saved.current.mood?.moodPosition ?? null,
			post_session_mood: saved.current.mood?.postSessionMood ?? null,
		});
		navigate();
	};

	const nextShown = (key: NextKey) => {
		if (key === "kfree") {
			// The pitch spends this session's offer: the next session won't show one.
			recordPlusOfferShown(sessionId);
			posthog.capture("plus_upsell_shown", { surface: "kindling" });
		} else if (key === "listener") {
			// Structural only: a user's themes must not be reconstructable from analytics.
			posthog.capture("xolacer_suggestion_shown", { variant: "activity" });
		}
	};

	const openNext = (key: NextKey) => {
		const profile = next.listener.profile;
		if (key === "listener" && profile) {
			posthog.capture("xolacer_suggestion_opened", { variant: "activity" });
			router.push({ params: profile, pathname: "/xolacer/[profileId]" });
		} else if (key === "kindling") {
			router.push("/kindling");
		} else if (key === "kindlingSettingUp") {
			leave({ action: "open_kindling", kindling_ready: false }, () =>
				router.dismissTo("/today")
			);
		} else if (key === "kfree") {
			posthog.capture("plus_upsell_tapped", { surface: "kindling" });
			openPaywall("kindling", sessionId ? { sessionId } : undefined);
		}
	};

	const ready = session != null && summary !== undefined;
	return {
		actions: {
			another: () =>
				leave({ action: "have_more" }, () => router.dismissTo("/")),
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
			day: dayOf(summary?.currentStreak ?? 1, null),
			from: fromOf(path),
			late: isNight,
			listener: next.listener.card,
			ready,
			slot: next.slot,
			words: wordsToShare(path, session?.distilledText),
		},
	};
}

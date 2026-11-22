import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";
import { useSessionMode } from "@/context/session-mode-context";
import { usePaywall } from "@/features/purchases/use-paywall";
import { goHome } from "@/lib/landing";
import { useAppStore } from "@/store/store";
import { useFollowUpAsk } from "./follow-up/follow-up-ask";
import { followUpBucket } from "./mood-scale";
import type { EndLetters, NextParts, SessionEnd } from "./session-end-data";
import {
	dayOf,
	fromOf,
	isPitch,
	letterPassed,
	type NextKey,
	pitchDismissed,
	ratingsSignalsOf,
	type SavedMood,
	type SessionExit,
	type SessionPath,
	sessionCompletedEvent,
	wordsToShare,
} from "./session-end-model";
import { useNextStep } from "./use-next-step";

const READY_WAIT_MS = 4000;

const UPSELL_SURFACE = "compounding_upsell";

const pitchEvent = (key: NextKey | null) => ({
	moment: null,
	surface: key === "upsell" ? UPSELL_SURFACE : "kindling",
	variant: "default",
});

type Saved = { mood: SavedMood | null; contributed: boolean | null };

export function useSessionEndData({
	path,
	sessionId,
	letters,
	parts,
}: {
	path: SessionPath;
	sessionId: Id<"sessions"> | null;
	letters: EndLetters;
	parts: NextParts;
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
	const markUpsellShown = useMutation(api.compounding.upsell.markShown);
	const next = useNextStep(sessionId, session, letters);
	const openPaywall = usePaywall((s) => s.open);
	const setPendingEventPrompt = useAppStore((s) => s.setPendingEventPrompt);
	const noteRatingsSignal = useAppStore((s) => s.noteRatingsSignal);
	const recordPlusOfferShown = useAppStore((s) => s.recordPlusOfferShown);
	const recordPlusOfferDismissal = useAppStore(
		(s) => s.recordPlusOfferDismissal
	);
	const saved = useRef<Saved>({ contributed: null, mood: null });
	const left = useRef(false);

	const missing = sessionId === null || session === null;
	useEffect(() => {
		if (missing && !left.current) {
			left.current = true;
			goHome();
		}
	}, [missing]);

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
	const complete = (exit: SessionExit) => {
		if (completed.current) {
			return;
		}
		completed.current = true;
		posthog.capture(
			"session_completed",
			sessionCompletedEvent(exit, saved.current.mood, saved.current.contributed)
		);
	};

	const shown = useRef<{ key: NextKey | null; taken: boolean }>({
		key: null,
		taken: false,
	});

	const leave = (exit: SessionExit, navigate: () => void) => {
		if (left.current) {
			return;
		}
		left.current = true;
		setPendingEventPrompt(null);
		if (pitchDismissed(shown.current.key, shown.current.taken)) {
			recordPlusOfferDismissal("session_close");
			posthog.capture("plus_offer_dismissed", pitchEvent(shown.current.key));
		}
		if (letterPassed(shown.current.key, shown.current.taken)) {
			letters.writePassed();
		}
		complete(exit);
		navigate();
	};

	const variant = path === "exit" ? "exit" : "activity";

	const nextShown = (key: NextKey) => {
		shown.current = { key, taken: false };
		if (isPitch(key)) {
			recordPlusOfferShown(sessionId);
			posthog.capture("plus_offer_shown", pitchEvent(key));
		}
		if (key === "kfree") {
			posthog.capture("plus_upsell_shown", { surface: "kindling" });
		} else if (key === "upsell" && next.upsell) {
			markUpsellShown(next.upsell).catch(() => undefined);
			posthog.capture("plus_upsell_shown", { surface: UPSELL_SURFACE });
		} else if (key === "unlock" && sessionId) {
			markUnlockSeen({ sessionId }).catch(() => undefined);
		} else if (key === "listener") {
			posthog.capture("xolacer_suggestion_shown", { variant });
		} else if (key === "letterWrite") {
			letters.writeShown();
		} else if (key === "letterRead") {
			letters.readShown();
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
			leave({ action: "open_kindling", kindling_ready: false }, () => goHome());
		} else if (key === "kfree") {
			posthog.capture("plus_upsell_tapped", { surface: "kindling" });
			complete({ action: "open_paywall" });
			openPaywall("kindling", sessionId ? { sessionId } : undefined);
		} else if (key === "upsell") {
			posthog.capture("plus_upsell_tapped", { surface: UPSELL_SURFACE });
			complete({ action: "open_paywall" });
			openPaywall(UPSELL_SURFACE);
		} else if (key === "unlock") {
			complete({ action: "open_steadiness" });
			router.push("/you/steadiness");
		} else if (key === "letterRead") {
			complete({ action: "open_letter" });
			letters.openRead();
		} else if (key === "letterWrite") {
			complete({ action: "write_letter" });
			letters.openWrite();
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
			done: () => leave({ action: "dismiss" }, () => goHome()),
			nextShown,
			openNext,
			saveMood: (mood) => {
				saved.current.mood = mood;
				save(mood);
				for (const signal of ratingsSignalsOf(mood)) {
					noteRatingsSignal(signal);
				}
			},
			share: (contributed) => {
				saved.current.contributed = contributed;
				save({ contributedReflection: contributed });
			},
		},
		state: {
			canAskFollowUp: canAsk === true,
			cards: {
				listener: next.listener.card,
				unlock: next.unlock,
				upsell: next.upsell?.domain ?? null,
			},
			day: summary ? dayOf(summary.currentStreak, null) : null,
			from: fromOf(path),
			late: isNight,
			letterTile: letters.tile,
			parts,
			ready,
			slot: next.slot,
			words: wordsToShare(path, session?.distilledText),
		},
	};
}

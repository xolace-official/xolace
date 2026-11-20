import {
	PLUS_OFFER_COOLDOWN_MS,
	PLUS_OFFER_DISMISSAL_LIMIT,
	PLUS_OFFER_FULL_STOP_MS,
} from "@/features/purchases/plus-offer-policy";
import type { RatingsSignal } from "@/store/ratings-slice";
import { asksFollowUp, moodOf, stepOf } from "./mood-scale";

export type SessionPath = "solo" | "peers" | "exit";
export type SessionFrom = "sit" | "peers";

export const pathOf = (param: string | undefined): SessionPath =>
	param === "solo" || param === "peers" ? param : "exit";

export const fromOf = (path: SessionPath): SessionFrom | null => {
	if (path === "solo") {
		return "sit";
	}
	return path === "peers" ? "peers" : null;
};

export function wordsToShare(
	path: SessionPath,
	distilledText: string | null | undefined
): string | null {
	const text = distilledText?.trim();
	return fromOf(path) && text ? text : null;
}

export type PostSessionMood = "heavier" | "same" | "lighter" | "unsure";
export type SavedMood = {
	postSessionMood: PostSessionMood;
	moodPosition?: number;
};

export function savedMood({
	step,
	unsure,
	position,
}: {
	step: number | null;
	unsure: boolean;
	position: number;
}): SavedMood | null {
	if (unsure) {
		return { postSessionMood: "unsure" };
	}
	return step === null
		? null
		: { moodPosition: position, postSessionMood: moodOf(step) };
}

export type SessionExit =
	| {
			action:
				| "dismiss"
				| "have_more"
				| "open_letter"
				| "open_listener"
				| "open_paywall"
				| "open_steadiness"
				| "write_letter";
	  }
	| { action: "open_kindling"; kindling_ready: boolean };

export type SessionCompletedEvent = SessionExit & {
	contributed_reflection: boolean | null;
	mood_position: number | null;
	post_session_mood: PostSessionMood | null;
};

export const sessionCompletedEvent = (
	exit: SessionExit,
	mood: SavedMood | null,
	contributed: boolean | null
): SessionCompletedEvent =>
	exit.action === "open_kindling"
		? {
				action: exit.action,
				contributed_reflection: contributed,
				kindling_ready: exit.kindling_ready,
				mood_position: mood?.moodPosition ?? null,
				post_session_mood: mood?.postSessionMood ?? null,
			}
		: {
				action: exit.action,
				contributed_reflection: contributed,
				mood_position: mood?.moodPosition ?? null,
				post_session_mood: mood?.postSessionMood ?? null,
			};

const MUCH_HEAVIER = -4;

export function ratingsSignalsOf(mood: SavedMood): RatingsSignal[] {
	if (mood.postSessionMood !== "heavier") {
		return ["light-session"];
	}
	const step =
		mood.moodPosition === undefined ? null : stepOf(mood.moodPosition);
	if (step === null) {
		return [];
	}
	return [
		...(asksFollowUp(step) ? (["heavier-follow-up"] as const) : []),
		...(step <= MUCH_HEAVIER ? (["much-heavier"] as const) : []),
	];
}

export function dayOf(
	streak: number,
	countedBefore: boolean | null
): { from: number; to: number } {
	const to = Math.max(1, streak);
	return { from: countedBefore === false ? Math.max(0, to - 1) : to, to };
}

export type ContinueStep = "ignore" | "ask" | "go";

export function continueStep({
	moment,
	pending,
	late,
	asked,
	canAsk,
	step,
}: {
	moment: 1 | 2;
	pending: boolean;
	late: boolean;
	asked: boolean;
	canAsk: boolean;
	step: number | null;
}): ContinueStep {
	if (moment !== 1 || pending) {
		return "ignore";
	}
	return !(late || asked) && canAsk && asksFollowUp(step) ? "ask" : "go";
}

export function momentGate() {
	let pending = false;
	let entered = false;
	return {
		get busy() {
			return pending || entered;
		},
		enter: () => {
			if (entered) {
				return false;
			}
			entered = true;
			pending = true;
			return true;
		},
		hold: () => {
			pending = true;
		},
	};
}

export function ctaLabel({
	moment,
	late,
	step,
	unsure,
}: {
	moment: 1 | 2;
	late: boolean;
	step: number | null;
	unsure: boolean;
}): 0 | 1 | 2 {
	if (moment === 2) {
		return 2;
	}
	return late || step !== null || unsure ? 1 : 0;
}

export type NextKey =
	| "listener"
	| "letterRead"
	| "kindling"
	| "kindlingSettingUp"
	| "unlock"
	| "letterWrite"
	| "listen"
	| "kfree"
	| "upsell"
	| "loading"
	| "none";

export type LetterOffer = { waiting: boolean; write: boolean };

export type NextInput = {
	listener: "pending" | "found" | "none";
	plus: boolean;
	qualifies: boolean | undefined;
	kindlingReady: boolean;
	listen: boolean;
	letters: LetterOffer | undefined;
	unlock: boolean | undefined;
	upsell: boolean | undefined;
	late: boolean;
	step: number | null;
	pitchAllowed: boolean;
	waitedOut: boolean;
};

export type SafeguardFields = {
	escalationTriggered?: boolean;
	safeguardLevel?: "none" | "gentle" | "elevated" | "crisis";
};

const sessionSafeguard = (s: SafeguardFields): boolean =>
	s.escalationTriggered === true ||
	s.safeguardLevel === "elevated" ||
	s.safeguardLevel === "crisis";

export function endSafeguard(
	session: SafeguardFields | null | undefined,
	context: { safeguardActive: boolean } | null | undefined
): boolean | undefined {
	if (session === undefined || context === undefined) {
		return;
	}
	if (session === null) {
		return true;
	}
	return sessionSafeguard(session) || context?.safeguardActive === true;
}

export function endLetterOffer(
	session: SafeguardFields | null | undefined,
	context: { safeguardActive: boolean } | null | undefined,
	offer: (safeguard: boolean) => LetterOffer | undefined
): LetterOffer | undefined {
	const safeguard = endSafeguard(session, context);
	return safeguard === undefined ? undefined : offer(safeguard);
}

const steadyFor = (late: boolean, step: number | null): boolean =>
	!late && step !== null && step >= 0;

export function nextKey(input: NextInput): NextKey {
	const { listener, plus, late, step, waitedOut } = input;
	const unknown =
		input.qualifies === undefined ||
		input.letters === undefined ||
		input.unlock === undefined ||
		input.upsell === undefined;
	if (listener === "pending" || (unknown && !waitedOut)) {
		return "loading";
	}
	if (listener === "found") {
		return "listener";
	}
	const steady = steadyFor(late, step);
	const letters = input.letters ?? { waiting: false, write: false };
	if (steady && letters.waiting) {
		return "letterRead";
	}
	if (steady && input.unlock === true) {
		return "unlock";
	}
	const qualifies = input.qualifies ?? false;
	if (plus && qualifies) {
		return input.kindlingReady ? "kindling" : "kindlingSettingUp";
	}
	if (steady && letters.write) {
		return "letterWrite";
	}
	if (plus) {
		return input.listen ? "listen" : "none";
	}
	if (late || asksFollowUp(step) || !input.pitchAllowed) {
		return "none";
	}
	if (input.upsell === true) {
		return "upsell";
	}
	return qualifies ? "kfree" : "none";
}

export const isPitch = (key: NextKey | null): boolean =>
	key === "kfree" || key === "upsell";

export type PitchContext = {
	safeguardActive: boolean;
	sessionId: string | null;
	previousSessionId: string | null;
	shownSessionId: string | null;
	lastDismissedAt: number | undefined;
	dismissalCount: number;
	fullStopSince: number | null;
	now: number;
};

export function pitchAllowed(c: PitchContext): boolean {
	if (c.safeguardActive) {
		return false;
	}
	const stopped =
		c.dismissalCount >= PLUS_OFFER_DISMISSAL_LIMIT &&
		c.fullStopSince !== null &&
		c.now - c.fullStopSince < PLUS_OFFER_FULL_STOP_MS;
	const shownThis = c.sessionId !== null && c.shownSessionId === c.sessionId;
	const shownLast =
		c.previousSessionId !== null && c.shownSessionId === c.previousSessionId;
	const cooling =
		c.lastDismissedAt !== undefined &&
		c.now - c.lastDismissedAt < PLUS_OFFER_COOLDOWN_MS;
	return !(stopped || cooling || (shownLast && !shownThis));
}

export function keptAtMoment2<T>(
	kept: { value: T } | null,
	moment: 1 | 2,
	live: T
): { value: T } | null {
	if (kept !== null || moment !== 2) {
		return kept;
	}
	return { value: live };
}

export const pitchDismissed = (
	shown: NextKey | null,
	taken: boolean
): boolean => isPitch(shown) && !taken;

export const letterPassed = (shown: NextKey | null, taken: boolean): boolean =>
	shown === "letterWrite" && !taken;

export const slotEmpty = (key: NextKey): boolean => key === "none";

/** A Xolacer's profile: `xolacerProfile` in, what the page says and offers out. Production's
 * request rules (the CTA by conversation, cooldown and availability), the prototype's page. Pure. */
import type { api } from "@xolace/backend/api";
import {
	isSpecialty,
	specialtyLabel,
	specialtyListensTo,
} from "@xolace/backend/convex/lib/specialties";
import type { FunctionReturnType } from "convex/server";
import {
	declineCooldownActive,
	declineCooldownNote,
	hasSpoken,
	rateCtaState,
} from "../chat-rules";

import { PROFILE } from "./copy";
import type { XolacerState } from "./xolacer-data";

export type Profile = NonNullable<
	FunctionReturnType<typeof api.xolacerChat.xolacerProfile>
>;

/** The call to action: production's states, in order. */
export type ProfileCta =
	| { kind: "self"; note: string }
	| { kind: "open"; label: string; note: string | null }
	| { kind: "cooldown"; label: string; note: string }
	| { kind: "unavailable"; label: string; note: string }
	| { kind: "ask"; label: string; note: string };

export type ProfileView = {
	name: string;
	nameA11y: string;
	/** "★ 4.9 · 32 conversations rated · here now", or "New Xolacer · replies within a day". */
	ratedLine: string;
	sinceLine: string;
	quote: string;
	tags: string[];
	/** An accent note above the facts. */
	note: { title: string; body: string } | null;
	cta: ProfileCta;
	rate:
		| { kind: "hidden" }
		| { kind: "prompt" }
		| { kind: "rated"; stars: number };
};

/** "March", or "March 2025" once it isn't this year, in the device's locale. */
export function monthYear(
	timestamp: number,
	now: number,
	locale?: string
): string {
	const date = new Date(timestamp);
	const sameYear = date.getFullYear() === new Date(now).getFullYear();
	return date.toLocaleDateString(locale, {
		month: "long",
		...(sameYear ? {} : { year: "numeric" }),
	});
}

function ctaOf(p: Profile, now: number): ProfileCta {
	const c = p.conversation;
	if (p.isSelf) {
		return { kind: "self", note: PROFILE.self };
	}
	if (c && c.status !== "closed") {
		const requested = c.status === "requested";
		return {
			kind: "open",
			label: requested ? PROFILE.seeRequest : PROFILE.openChat,
			note: requested ? PROFILE.requestNote(p.displayName) : null,
		};
	}
	// Before availability: "not taking conversations" would be untrue about someone who
	// declined. Compared with now, not merely present: a cached past timestamp would disable
	// the button with nothing to refresh it.
	const until = c?.retryAvailableAt;
	if (declineCooldownActive(until, now)) {
		return {
			kind: "cooldown",
			label: PROFILE.cooldown,
			note: declineCooldownNote(p.displayName, until, now),
		};
	}
	if (!p.available) {
		return {
			kind: "unavailable",
			label: PROFILE.notTaking,
			note: PROFILE.notTakingNote,
		};
	}
	return { kind: "ask", label: PROFILE.ask, note: PROFILE.askSub };
}

function noteOf(p: Profile, now: number): ProfileView["note"] {
	const c = p.conversation;
	const hasThread = c !== null && c.status !== "closed";
	if (hasThread) {
		return {
			body: c.status === "resting" ? PROFILE.talkedResting : PROFILE.talkedOpen,
			title: PROFILE.talkedBefore,
		};
	}
	// Not under a cooldown: the CTA already names it, and this beside it reads as a second no.
	if (!(p.available || declineCooldownActive(c?.retryAvailableAt, now))) {
		return {
			body: PROFILE.notRightNow(p.displayName),
			title: PROFILE.notRightNowTitle,
		};
	}
	return null;
}

export function profileView(
	p: Profile,
	now: number,
	locale?: string
): ProfileView {
	const presence = p.present ? PROFILE.hereNow : PROFILE.repliesInADay;
	const rating =
		p.rating === undefined
			? PROFILE.newXolacer
			: PROFILE.rated(p.rating, p.ratingCount);
	const rate = rateCtaState(p);
	return {
		cta: ctaOf(p, now),
		name: p.displayName,
		nameA11y: p.present ? PROFILE.nameHereNow(p.displayName) : p.displayName,
		note: noteOf(p, now),
		quote: p.bio,
		rate:
			rate === "rated" && p.myRating !== undefined
				? { kind: "rated", stars: p.myRating }
				: rate === "prompt"
					? { kind: "prompt" }
					: { kind: "hidden" },
		ratedLine: `${rating} · ${presence}`,
		sinceLine: PROFILE.since(monthYear(p.xolacerSince, now, locale)),
		tags: p.specialties.map(specialtyLabel),
	};
}

/** What `useXolacer` and the dev states read: the profile (`undefined` while it loads, `null`
 * once it's gone), the clock and locale, the route's specialty, and the screen's own state. */
export type XolacerInputs = {
	profile: Profile | null | undefined;
	now: number;
	locale?: string;
	/** The route's specialty param, as it came. */
	specialty: string | undefined;
	blocking: { open: boolean; pending: boolean };
	primer: "gate" | "reference" | null;
	sending: boolean;
};

/** The profile's screen state. The hook and the dev states both call it, so the rules (what the
 * block dialog says, the menu, "Others listen to …") are tested once. */
export function xolacerState(input: XolacerInputs): XolacerState {
	const p = input.profile;
	if (p === undefined) {
		return { phase: "loading" };
	}
	if (p === null) {
		return { phase: "gone" };
	}
	const c = p.conversation;
	return {
		// "Your messages stay" only when the two of you have spoken.
		blocking: { ...input.blocking, history: c ? hasSpoken(c) : false },
		id: p.xolacerProfileId,
		isSelf: p.isSelf,
		menu: p.isSelf ? null : { canBlock: c !== null, rate: rateCtaState(p) },
		muted: !p.available,
		others: isSpecialty(input.specialty)
			? specialtyListensTo(input.specialty)
			: null,
		phase: "ready",
		photoUrl: p.photoUrl,
		present: p.present,
		primer: input.primer,
		sending: input.sending,
		view: profileView(p, input.now, input.locale),
	};
}

import type {
	PlusOfferMoment,
	PlusOfferVariant,
} from "@/features/purchases/plus-offer-policy";

// Copy for the five proactive Plus moments (#221 §4). No price, term, trial or number
// (#221 rule 6); at most ~3 rendered lines or the scrim climbs over the mascot. Every
// line spells "Xolace+" exactly, because the card highlights that token in accent.
export type PlusOfferCopy = {
	/** Static opener. Distinct from the observation line, which is data-derived. */
	lead?: string;
	/** The one capability this moment earned. One sentence. */
	value: string;
	cta: string;
};

/** A decline is an answer, not a deferral; the label must mean what the system does. */
export const PLUS_OFFER_DECLINE_LABEL = "I'm good";

const MOMENTS: Record<PlusOfferMoment, PlusOfferCopy> = {
	1: {
		cta: "See what carries over",
		lead: "That's one day kept.",
		value:
			"Xolace+ is where the thing that keeps coming back shows up early — the third time, not the thirtieth.",
	},
	2: {
		cta: "See what comes back",
		lead: "Glad that one landed.",
		value:
			"Xolace+ keeps the ones that land — so when the same thing comes back, you'll know it's the same thing.",
	},
	3: {
		cta: "See the whole run",
		value:
			"That's the kind of thing that's invisible from the inside. Xolace+ is what keeps it visible — the third time, not the thirtieth.",
	},
	4: {
		cta: "See what carried over",
		value:
			"Nothing you said here got lost. Xolace+ is what makes the time in between legible instead of a blank — so coming back doesn't mean starting over.",
	},
	5: {
		cta: "See what it adds up to",
		value:
			"Most people never say any of it once. Xolace+ shows you what all that showing up has been building up.",
	},
};

/** Swaps the value line on whichever moment fires next; never adds a moment. The `lead`
 * survives the swap (#221 §4). */
const REGISTER = {
	cta: "Pick how it sounds",
	value:
		"Xolace+ is where you pick how it says things back — and it stays that way.",
};

export function plusOfferCopy(
	moment: PlusOfferMoment,
	variant: PlusOfferVariant = "default"
): PlusOfferCopy {
	const copy = MOMENTS[moment];
	return variant === "register" ? { ...copy, ...REGISTER } : copy;
}

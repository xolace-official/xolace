import type {
  PlusOfferMoment,
  PlusOfferVariant,
} from "@/src/features/purchases/plus-offer-policy";

/**
 * Copy for the five proactive Plus moments (#221 §4).
 *
 * A lead plus one value sentence per moment. The card is a night-scene
 * postcard and this copy rides a scrim pinned to its bottom edge — the scrim
 * grows upward, so a longer line costs mascot, not card height. Past roughly
 * three rendered lines it starts climbing over his head. The moment sells one
 * capability: no price, no term, no trial, no number lives here (#221 rule 6).
 *
 * Every line spells the product "Xolace+", identically, because the card
 * highlights that token in accent. A line that says "Plus" renders flat.
 */
export type PlusOfferCopy = {
  /** Static opener. Distinct from the observation line, which is data-derived. */
  lead?: string;
  /** The one capability this moment earned. One sentence. */
  value: string;
  cta: string;
};

/** A decline is an answer, not a deferral — the label has to mean what the system does. */
export const PLUS_OFFER_DECLINE_LABEL = "I'm good";

const MOMENTS: Record<PlusOfferMoment, PlusOfferCopy> = {
  1: {
    lead: "That's one day kept.",
    value:
      "Xolace+ is where the thing that keeps coming back shows up early — the third time, not the thirtieth.",
    cta: "See what carries over",
  },
  2: {
    lead: "Glad that one landed.",
    value:
      "Xolace+ keeps the ones that land — so when the same thing comes back, you'll know it's the same thing.",
    cta: "See what comes back",
  },
  3: {
    value:
      "That's the kind of thing that's invisible from the inside. Xolace+ is what keeps it visible — the third time, not the thirtieth.",
    cta: "See the whole run",
  },
  4: {
    value:
      "Nothing you said here got lost. Xolace+ is what makes the time in between legible instead of a blank — so coming back doesn't mean starting over.",
    cta: "See what carried over",
  },
  5: {
    // Not "where compounding starts" — the user is already showing up. Plus is
    // what makes what they've built out of it visible to them.
    value:
      "Most people never say any of it once. Xolace+ shows you what all that showing up has been building up.",
    cta: "See what it adds up to",
  },
};

/**
 * Swaps the value line on whichever moment fires next. Never adds a moment.
 *
 * The moment's `lead` deliberately survives the swap (#221 §4): it acknowledges
 * what actually just happened and is still true for this user — only the pitch
 * underneath it changes. Dropping it would leave the register variant opening
 * cold on a sell.
 */
const REGISTER = {
  value: "Xolace+ is where you pick how it says things back — and it stays that way.",
  cta: "Pick how it sounds",
};

export function plusOfferCopy(
  moment: PlusOfferMoment,
  variant: PlusOfferVariant = "default",
): PlusOfferCopy {
  const copy = MOMENTS[moment];
  return variant === "register" ? { ...copy, ...REGISTER } : copy;
}

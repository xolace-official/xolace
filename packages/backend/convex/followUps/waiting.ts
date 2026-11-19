/**
 * Coming back v2 (B1): the one follow-up card waiting on the person, for the
 * greeting's check-in row and Today's pill, and the silent expiry that ends
 * its wait.
 *
 * The wait runs after the tier timers, never alongside them. While a card is
 * `pending` its workflow nudges and may expire it (acute 48 h, elevated 7 d,
 * standard 14 d after the nudges). `markReturn` flips it to `ready` and stops
 * the workflow; the first `markShown` starts a 3-day wait, and
 * `expireShownCard` closes the card if it's still unanswered then. Closing the
 * check-in without answering writes nothing on new builds, so the card keeps
 * waiting; old builds still send "dismissed" (decided: accept the mix).
 */
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import {
	isCardWaiting,
	WAITING_CARD_LIFETIME_MS,
	waitingSince,
} from "../lib/followUpCadence";
import { collapseCard } from "../outreach/telegram/checkIn";
import schema from "../schema";

// One live card per profile (createAndStart supersedes); this only bounds a
// profile left with strays by older code.
const CANDIDATES_PER_STATUS = 5;

const cardFields = schema.tables.follow_up_cards.validator.fields;

export const waitingCardValidator = v.object({
	_id: v.id("follow_up_cards"),
	cardText: cardFields.cardText,
	// When the session ended unresolved; the client names the day in local time.
	createdAt: cardFields.createdAt,
	// Gates the check-in's "resources are still here" link and sharing.
	escalationDerived: cardFields.escalationDerived,
	// False while `ready`: the person is back but hasn't seen it yet.
	shown: v.boolean(),
	tier: cardFields.tier,
});

/**
 * The newest `ready` or `shown` card under 3 days into its wait, or null.
 * Unlike `getReadyCard` it ignores the 2-hour re-show cooldown: the greeting
 * and Today's pill show a waiting card whenever it's there.
 */
export const getWaitingCard = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const byStatus = (status: "ready" | "shown") =>
			ctx.db
				.query("follow_up_cards")
				.withIndex("by_profile_status", (q) =>
					q.eq("emotionalProfileId", profile._id).eq("status", status)
				)
				.order("desc")
				.take(CANDIDATES_PER_STATUS);
		const [ready, shown] = await Promise.all([
			byStatus("ready"),
			byStatus("shown"),
		]);

		const now = Date.now();
		const card = [...ready, ...shown]
			.filter((c) => isCardWaiting(c, now))
			.sort((a, b) => b.createdAt - a.createdAt)[0];
		return card ? toWaitingCard(card) : null;
	},
	returns: v.union(waitingCardValidator, v.null()),
});

function toWaitingCard(card: Doc<"follow_up_cards">) {
	return {
		_id: card._id,
		cardText: card.cardText,
		createdAt: card.createdAt,
		escalationDerived: card.escalationDerived,
		shown: card.status === "shown",
		tier: card.tier,
	};
}

/**
 * Scheduled by the first `markShown`, `WAITING_CARD_LIFETIME_MS` later. Closes
 * a still-unanswered shown card, silently: no nudge, no outreach. Its earlier
 * Telegram check-ins lose their buttons, as on every close. Anything else
 * (answered, dismissed, superseded, gone) is left alone.
 */
export const expireShownCard = internalMutation({
	args: { cardId: v.id("follow_up_cards") },
	handler: async (ctx, args) => {
		const card = await ctx.db.get("follow_up_cards", args.cardId);
		if (!card || card.status !== "shown") {
			return null;
		}
		if (Date.now() - waitingSince(card) < WAITING_CARD_LIFETIME_MS) {
			return null;
		}
		await ctx.db.patch("follow_up_cards", card._id, { status: "expired" });
		await collapseCard(ctx, card._id);
		return null;
	},
	returns: v.null(),
});

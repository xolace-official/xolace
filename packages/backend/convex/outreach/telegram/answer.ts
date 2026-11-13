import type { Doc } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import { resolveCardCore } from "../../followUps/resolve";
import {
	type AnswerAction,
	NO_REPLY,
	offeredAnswers,
	refuseTap,
	type TapReply,
	type TapTarget,
	tappedCheckIn,
	tierOf,
} from "./checkIn";
import {
	ALREADY_ANSWERED_TOAST,
	ANSWERED_TOAST,
	CHECK_IN_CLOSED_TOAST,
} from "./copy";

/**
 * Answering a check-in by tapping in Telegram (#769). Only the answers the
 * buttons offer; changing an answer, `processed`, `vent` and `dismissed`
 * stay in the app.
 */

/**
 * Why a tap can't answer this card: it already has an answer (from the app,
 * any response but a dismiss, or from here), or it closed.
 */
const refusalToast = (card: Doc<"follow_up_cards"> | null) =>
	card?.status === "resolved" && card.userResponse !== "dismissed"
		? ALREADY_ANSWERED_TOAST
		: CHECK_IN_CLOSED_TOAST;

/**
 * An answer tap. On a live check-in it resolves the card through the shared
 * core (source `telegram`), which collapses the message to the answer line.
 * The first answer wins, from the app or here: a later tap gets "Already
 * answered", a tap on a dismissed, expired or superseded card the closed
 * toast, and both get the collapse again. A tap naming anything but this
 * chat's own check-in, or an answer it never offered, does nothing.
 */
export async function answer(
	ctx: MutationCtx,
	args: TapTarget & { response: AnswerAction }
): Promise<TapReply> {
	const tapped = await tappedCheckIn(ctx, args);
	if (!tapped) {
		return NO_REPLY;
	}
	const { card, delivery, outreach } = tapped;
	if (card && !offeredAnswers(tierOf(outreach, card)).includes(args.response)) {
		return NO_REPLY;
	}
	if (!(card && delivery.checkInOpen)) {
		return await refuseTap(ctx, tapped, refusalToast(card));
	}
	const outcome = await resolveCardCore(ctx, {
		cardId: card._id,
		profileId: args.profileId,
		response: args.response,
		source: "telegram",
	});
	switch (outcome) {
		case "accepted":
			return { edits: [], toast: ANSWERED_TOAST };
		case "not_found":
			return NO_REPLY;
		default:
			return await refuseTap(ctx, tapped, refusalToast(card));
	}
}

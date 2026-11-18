/** Fixture messages as Stream holds them: reactions, removed, failed and edited. Pure. */
import { NOW } from "../../dev/fixtures";
import { MINUTE } from "./thread-fixtures";

export const ME = "profile_me";

export type DevMessage = {
	mine: boolean;
	text: string;
	/** Minutes before now. */
	ago: number;
	failed?: boolean;
	/** Removed by its author: Stream keeps it in the list as `deleted`. */
	deleted?: boolean;
	/** Its words changed after it was sent. */
	edited?: boolean;
	reaction?: string;
	/** Many people's reactions (the channel's cards): counts, and whether one is yours. */
	reactions?: readonly { type: string; count: number; mine?: boolean }[];
};

type ReactionGroup = {
	count: number;
	first_reaction_at: string;
	last_reaction_at: string;
	sum_scores: number;
};

function reactionsOf(m: DevMessage, at: string, other: { id: string }) {
	const many =
		m.reactions ?? (m.reaction ? [{ count: 1, type: m.reaction }] : []);
	const group = (count: number): ReactionGroup => ({
		count,
		first_reaction_at: at,
		last_reaction_at: at,
		sum_scores: count,
	});
	return {
		latest_reactions: many.map((r) => ({
			created_at: at,
			type: r.type,
			user: r.mine ? { id: ME } : other,
			user_id: r.mine ? ME : other.id,
		})),
		own_reactions: many
			.filter((r) => r.mine)
			.map((r) => ({ created_at: at, type: r.type, user_id: ME })),
		reaction_groups: Object.fromEntries(
			many.map((r) => [r.type, group(r.count)])
		),
	};
}

function devType(m: DevMessage) {
	if (m.deleted) {
		return "deleted";
	}
	return m.failed ? "error" : "regular";
}

/** One fixture as the Stream message the list draws. */
export function streamMessage(
	m: DevMessage,
	index: number,
	me: { id: string; name: string },
	other: { id: string; name: string }
) {
	const at = new Date(NOW - m.ago * MINUTE).toISOString();
	return {
		created_at: at,
		id: `dev-${index}`,
		...reactionsOf(m, at, other),
		...(m.deleted ? { deleted_at: at } : {}),
		...(m.edited ? { message_text_updated_at: at } : {}),
		status: m.failed ? "failed" : "received",
		text: m.text,
		type: devType(m),
		updated_at: at,
		user: m.mine ? me : other,
	};
}

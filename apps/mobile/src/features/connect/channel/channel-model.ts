/** The Xolace channel: a Stream message in, the card it draws out, and what the body shows while
 * Stream comes up. Pure. */
import { type Clock, whenLabel } from "../list/chats-model";
import { REACTIONS } from "../reactions";
import type { StreamStatus } from "../thread/thread-model";
import { CHANNEL } from "./copy";

/** A first paragraph this short, followed by more, reads as the post's title. */
const TITLE_MAX = 80;

export type PostReaction = {
	type: string;
	emoji: string;
	count: number;
	mine: boolean;
	a11y: string;
	hint: string;
};

export type PostView = {
	title: string | null;
	body: string;
	when: string;
	reactions: PostReaction[];
	a11y: string;
};

/** What a post carries, as Stream's message has it. */
export type PostMessage = {
	text?: string;
	created_at?: Date | string;
	reaction_groups?: Record<string, { count: number }> | null;
	own_reactions?: readonly { type: string }[] | null;
};

/** Posts are plain messages. A short first paragraph with more under it is the title (the
 * prototype's cards have one); anything else is all body. */
export function splitPost(text: string): {
	title: string | null;
	body: string;
} {
	const paragraphs = text
		.trim()
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean);
	const [first, ...rest] = paragraphs;
	if (
		first &&
		rest.length > 0 &&
		!first.includes("\n") &&
		first.length <= TITLE_MAX
	) {
		return { body: rest.join("\n\n"), title: first };
	}
	return { body: paragraphs.join("\n\n"), title: null };
}

/** The reactions a card shows: the seven in picker order, only those someone used. */
function postReactions(m: PostMessage): PostReaction[] {
	const own = new Set((m.own_reactions ?? []).map((r) => r.type));
	return REACTIONS.flatMap(([type, emoji]) => {
		const count = m.reaction_groups?.[type]?.count ?? 0;
		if (count <= 0) {
			return [];
		}
		const mine = own.has(type);
		return [
			{
				a11y: CHANNEL.reaction(
					CHANNEL.reactionNames[type] ?? type,
					count,
					mine
				),
				count,
				emoji,
				hint: CHANNEL.reactionHint(mine),
				mine,
				type,
			},
		];
	});
}

export function postView(
	m: PostMessage,
	now: number,
	clock: Clock = {}
): PostView {
	const { title, body } = splitPost(m.text ?? "");
	const at = m.created_at ? new Date(m.created_at).getTime() : now;
	// Stream's separator above the card already says the day; the card says the time.
	const when = whenLabel(at, at, clock);
	return {
		a11y: [title, body, when]
			.map((part) => part?.replace(/[.\s]+$/, ""))
			.filter(Boolean)
			.join(". "),
		body,
		reactions: postReactions(m),
		title,
		when,
	};
}

/** The body: Stream's list once the channel holds state, else the skeleton or the retry. */
export function channelBody(
	stream: StreamStatus,
	channelReady: boolean
): "messages" | "connecting" | "unavailable" {
	if (stream === "unavailable") {
		return "unavailable";
	}
	return stream === "ready" && channelReady ? "messages" : "connecting";
}

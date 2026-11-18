/** The Xolace channel: a Stream message in, the card it draws out, and what the body shows while
 * Stream comes up. Pure. */
import type { Channel } from "stream-chat";
import { type Clock, whenLabel } from "../list/chats-model";
import { REACTIONS } from "../reactions";
import type { StreamStatus } from "../thread/thread-model";
import { CHANNEL } from "./copy";

/** A first paragraph this short, followed by more, reads as the post's title. */
const TITLE_MAX = 80;

/** What a tap on a reaction does to yours. */
type ReactionTap = "add" | "swap" | "remove";

export type PostReaction = {
	type: string;
	emoji: string;
	count: number;
	mine: boolean;
	a11y: string;
	hint: string;
};

/** A post as it stands: on the card, removed by the broadcaster (Stream keeps it in the list as
 * `deleted`), or a broadcast of yours that didn't reach Stream. */
export type PostKind = "post" | "deleted" | "failed";

export type PostView = {
	kind: PostKind;
	/** The broadcaster changed its words after posting (Stream's `message_text_updated_at`). */
	edited: boolean;
	title: string | null;
	/** Markdown, as posted; the card renders it through Stream. */
	body: string;
	/** The links in it, each a VoiceOver action on the card (the card is one stop). */
	links: string[];
	when: string;
	reactions: PostReaction[];
	a11y: string;
};

/** What a post carries, as Stream's message has it. */
export type PostMessage = {
	text?: string;
	type?: string;
	status?: string;
	deleted_at?: Date | string | null;
	message_text_updated_at?: Date | string | null;
	created_at?: Date | string;
	reaction_groups?: Record<string, { count: number }> | null;
	own_reactions?: readonly { type: string }[] | null;
};

const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const BARE_URL = /https?:\/\/[^\s)<>\]]+/g;
const EMPHASIS =
	/(\*\*|__|~~|`)(.+?)\1|(?<![\w*])[*_](?!\s)(.+?)(?<!\s)[*_](?![\w*])/g;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

/** What a reader hears or a title shows: the words without the markdown around them. */
export function plainText(markdown: string): string {
	return markdown
		.replace(MARKDOWN_LINK, "$1")
		.replace(EMPHASIS, (_, _mark, wrapped, single) => wrapped ?? single);
}

/** Every link in a post, in order, once each: markdown links' targets, then bare URLs. */
export function postLinks(markdown: string): string[] {
	const named = [...markdown.matchAll(MARKDOWN_LINK)].map((m) => m[2] ?? "");
	const bare = [...markdown.replace(MARKDOWN_LINK, "").matchAll(BARE_URL)].map(
		(m) => m[0].replace(TRAILING_PUNCTUATION, "")
	);
	return [...new Set([...named, ...bare])].filter(Boolean);
}

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
	return REACTIONS.flatMap(([type, emoji, name]) => {
		const count = m.reaction_groups?.[type]?.count ?? 0;
		if (count <= 0) {
			return [];
		}
		const mine = own.has(type);
		// One reaction each (`enforceUniqueReaction`): a tap on another swaps yours for it.
		let tap: ReactionTap = "add";
		if (mine) {
			tap = "remove";
		} else if (own.size > 0) {
			tap = "swap";
		}
		return [
			{
				// Yours is `selected`, which VoiceOver says itself.
				a11y: CHANNEL.reaction(name, count),
				count,
				emoji,
				hint: CHANNEL.reactionHint[tap],
				mine,
				type,
			},
		];
	});
}

/** Stream's own tests: `deleted` for a removed message, `error` or `failed` for one that didn't
 * send (`Message.tsx`, `errorOrFailed`). */
export function postKind(m: PostMessage): PostKind {
	if (m.type === "deleted" || m.deleted_at) {
		return "deleted";
	}
	return m.type === "error" || m.status === "failed" ? "failed" : "post";
}

export function postView(
	m: PostMessage,
	now: number,
	clock: Clock = {}
): PostView {
	const kind = postKind(m);
	const at = m.created_at ? new Date(m.created_at).getTime() : now;
	// Stream's separator above the card already says the day; the card says the time.
	const when = whenLabel(at, at, clock);
	if (kind === "deleted") {
		// Nothing of what it said, and nothing left to react to.
		return {
			a11y: `${CHANNEL.removed} ${when}`,
			body: "",
			edited: false,
			kind,
			links: [],
			reactions: [],
			title: null,
			when,
		};
	}
	const split = splitPost(m.text ?? "");
	const title = split.title === null ? null : plainText(split.title);
	const body = split.body;
	const edited = kind === "post" && Boolean(m.message_text_updated_at);
	return {
		a11y: [
			title,
			plainText(body),
			kind === "failed" ? CHANNEL.notSent : null,
			edited ? `${when}, ${CHANNEL.edited.toLowerCase()}` : when,
		]
			.map((part) => part?.replace(/[.\s]+$/, ""))
			.filter(Boolean)
			.join(". "),
		body,
		edited,
		kind,
		links: postLinks(body),
		// A post that never reached Stream has no one's reactions, and can't take yours.
		reactions: kind === "post" ? postReactions(m) : [],
		title,
		when,
	};
}

/** What the screen draws: Stream's list once the channel holds state, else the skeleton, or the
 * retry after Stream failed. Only the list carries the channel. */
export type ChannelState =
	| { body: "messages"; channel: Channel }
	| { body: "connecting" }
	| { body: "unavailable" };

/** The screen's state from Stream's status, whether the channel holds state yet, and the channel.
 * The hook and the dev fixture both build it here. */
export function channelState(
	stream: StreamStatus,
	ready: boolean,
	channel: Channel | null
): ChannelState {
	if (stream === "unavailable") {
		return { body: "unavailable" };
	}
	return stream === "ready" && ready && channel
		? { body: "messages", channel }
		: { body: "connecting" };
}

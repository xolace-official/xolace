import type { Channel } from "stream-chat";
import { type Clock, whenLabel } from "../list/chats-model";
import { REACTIONS } from "../reactions";
import type { StreamStatus } from "../thread/thread-model";
import { CHANNEL } from "./copy";
import { plainText, postLinks, splitPost } from "./post-text";

type ReactionTap = "add" | "swap" | "remove";

export type PostReaction = {
	type: string;
	emoji: string;
	count: number;
	mine: boolean;
	a11y: string;
	hint: string;
};

export type PostKind = "post" | "deleted" | "failed";

export type PostLink = { url: string; label: string };

export type PostView = {
	kind: PostKind;
	edited: boolean;
	title: string | null;
	body: string;
	links: PostLink[];
	when: string;
	reactions: PostReaction[];
	a11y: string;
};

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

function linkActions(text: string): PostLink[] {
	const times = new Map<string, number>();
	return postLinks(text).map(({ url, words }) => {
		const base = CHANNEL.openLink(words, 1);
		const nth = (times.get(base) ?? 0) + 1;
		times.set(base, nth);
		return { label: CHANNEL.openLink(words, nth), url };
	});
}

function postReactions(m: PostMessage): PostReaction[] {
	const own = new Set((m.own_reactions ?? []).map((r) => r.type));
	return REACTIONS.flatMap(([type, emoji, name]) => {
		const count = m.reaction_groups?.[type]?.count ?? 0;
		if (count <= 0) {
			return [];
		}
		const mine = own.has(type);
		let tap: ReactionTap = "add";
		if (mine) {
			tap = "remove";
		} else if (own.size > 0) {
			tap = "swap";
		}
		return [
			{
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

function postKind(m: PostMessage): PostKind {
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
	const when = whenLabel(at, at, clock);
	if (kind === "deleted") {
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
		links: linkActions(m.text ?? ""),
		reactions: kind === "post" ? postReactions(m) : [],
		title,
		when,
	};
}

export type ChannelState =
	| { body: "messages"; channel: Channel }
	| { body: "connecting" }
	| { body: "unavailable" };

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

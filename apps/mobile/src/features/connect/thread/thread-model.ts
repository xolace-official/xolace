import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";
import type { Channel } from "stream-chat";
import { rateCtaState } from "../chat-rules";
import { THREAD } from "./copy";
import type { ThreadState } from "./thread-data";

export type ThreadConversation = Omit<
	NonNullable<FunctionReturnType<typeof api.xolacerChat.getConversation>>,
	"myStreamUserId"
> & {
	seeded?: true;
};

export type StreamStatus = "connecting" | "ready" | "unavailable";

export type Activity = {
	typing: boolean;
	presence: { online: boolean; lastActive?: number | null } | null;
};

export type Run = { text: string; bold?: boolean };

const DAY_MS = 86_400_000;
const WEEK_DAYS = 7;
const MONTH_DAYS = 30;
const MONTH_WEEKS = 5;

export function longAgo(timestamp: number, now: number): string {
	const days = Math.floor((now - timestamp) / DAY_MS);
	if (days <= 0) {
		return "today";
	}
	if (days === 1) {
		return "yesterday";
	}
	if (days < WEEK_DAYS) {
		return `${days} days ago`;
	}
	const weeks = Math.floor(days / WEEK_DAYS);
	if (weeks < MONTH_WEEKS) {
		return weeks === 1 ? "a week ago" : `${weeks} weeks ago`;
	}
	const months = Math.floor(days / MONTH_DAYS);
	return months === 1 ? "a month ago" : `${months} months ago`;
}

export function threadSubtitle(
	c: ThreadConversation,
	activity: Activity,
	now: number
): string {
	const say = (line: string) =>
		c.role === "user"
			? `${THREAD.xolacerPrefix}${line}`
			: `${line.charAt(0).toUpperCase()}${line.slice(1)}`;
	if (c.status === "open") {
		if (activity.typing) {
			return say(THREAD.typing);
		}
		if (!activity.presence) {
			return say(THREAD.usuallyReplies);
		}
		if (activity.presence.online) {
			return say(THREAD.hereNow);
		}
		const last = activity.presence.lastActive;
		return say(last ? THREAD.lastHere(longAgo(last, now)) : THREAD.offline);
	}
	if (c.status === "requested") {
		if (c.role !== "xolacer") {
			return THREAD.requestSent;
		}
		return c.origin === "suggestion"
			? THREAD.waitingOnYouAfterSession
			: THREAD.waitingOnYou;
	}
	if (c.status === "resting") {
		return c.lastMessageAt
			? THREAD.restingSince(longAgo(c.lastMessageAt, now))
			: THREAD.resting;
	}
	return c.role === "xolacer" ? THREAD.requestClosed : THREAD.notTaking;
}

export type ThreadBody =
	| { kind: "no-channel"; note: string }
	| { kind: "connecting" }
	| { kind: "unavailable" }
	| { kind: "messages" };

export function threadBody(
	c: ThreadConversation,
	stream: StreamStatus
): ThreadBody {
	if (!c.streamChannelId) {
		return {
			kind: "no-channel",
			note:
				c.status === "closed"
					? THREAD.nothingSaid
					: c.role === "xolacer"
						? THREAD.opensOnAccept
						: THREAD.appearsOnAccept,
		};
	}
	if (stream === "ready") {
		return { kind: "messages" };
	}
	return { kind: stream };
}

export type StatusBar =
	| { kind: "composer" }
	/** A seeded row whose real status hasn't landed: hold the space. */
	| { kind: "holding" }
	| { kind: "accept"; copy: readonly Run[] }
	| { kind: "sent"; copy: readonly Run[] }
	| { kind: "resume"; copy: readonly Run[]; rate: string | null }
	| {
			kind: "closed";
			copy: readonly Run[];
			findAnother: boolean;
			rate: string | null;
	  };

function ratePrompt(c: ThreadConversation): string | null {
	const state = rateCtaState(c);
	if (state === "hidden") {
		return null;
	}
	return state === "prompt" ? THREAD.bar.rate : THREAD.bar.changeRating;
}

export function statusBar(c: ThreadConversation): StatusBar {
	if (c.status === "open") {
		return { kind: "composer" };
	}
	if (c.seeded && c.status !== "requested") {
		return { kind: "holding" };
	}
	const name = c.counterpartName;
	const b = THREAD.bar;
	if (c.status === "requested") {
		if (c.role === "xolacer") {
			return {
				copy: c.counterpartPresent ? b.askedPresent(name) : b.asked(name),
				kind: "accept",
			};
		}
		return {
			copy: c.counterpartPresent ? b.sentPresent(name) : b.sentAway(name),
			kind: "sent",
		};
	}
	if (c.status === "resting" && c.resumable) {
		const manual = c.restingReason === "manual";
		return {
			copy: manual
				? c.role === "xolacer"
					? b.youWrappedUp
					: b.theyWrappedUp(name)
				: b.goneQuiet(name),
			kind: "resume",
			rate: ratePrompt(c),
		};
	}
	const history = Boolean(c.streamChannelId);
	if (c.role === "xolacer") {
		return {
			copy: history ? b.closedHistory : b.closedRequest,
			findAnother: false,
			kind: "closed",
			rate: null,
		};
	}
	return {
		copy: history ? b.steppedBack(name) : b.cantPickUp(name),
		findAnother: true,
		kind: "closed",
		rate: ratePrompt(c),
	};
}

type Resource = {
	type: "phone" | "url" | "text" | "email";
	label: string;
	value: string;
	description?: string;
};

export function resourceRow(r: Resource): {
	title: string;
	sub: string;
	action: string | null;
	phone: boolean;
	url: string | null;
	failure: string;
} {
	const sub = r.description ?? r.value;
	if (r.type === "phone") {
		return {
			action: THREAD.resource.call,
			failure: THREAD.resource.noDialer,
			phone: true,
			sub: r.description ? `${r.description} · ${r.value}` : r.value,
			title: r.label,
			url: `tel:${r.value}`,
		};
	}
	if (r.type === "email") {
		return {
			action: THREAD.resource.email,
			failure: THREAD.resource.noMail,
			phone: false,
			sub,
			title: r.label,
			url: `mailto:${r.value}`,
		};
	}
	if (r.type === "url") {
		return {
			action: THREAD.resource.open,
			failure: THREAD.resource.noLink,
			phone: false,
			sub: r.description ?? "",
			title: r.label,
			url: r.value,
		};
	}
	return {
		action: null,
		failure: "",
		phone: false,
		sub: r.value,
		title: r.label,
		url: null,
	};
}

export type ThreadInputs = {
	conversation: ThreadConversation | null | undefined;
	stream: StreamStatus;
	channel: Channel | null;
	blocking: { open: boolean; pending: boolean };
	answering: boolean;
};

export function threadState(input: ThreadInputs): ThreadState {
	const c = input.conversation;
	if (c === undefined) {
		return { phase: "loading" };
	}
	if (c === null) {
		return { phase: "gone" };
	}
	return {
		answering: input.answering,
		bar: statusBar(c),
		blocking: { ...input.blocking, history: Boolean(c.streamChannelId) },
		body: threadBody(c, input.stream),
		channel: input.channel,
		conversation: c,
		phase: "ready",
		rate: rateCtaState(c),
	};
}

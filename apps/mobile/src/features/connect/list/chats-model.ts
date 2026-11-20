import type { api } from "@xolace/backend/api";
import { CHAT_REQUEST_SUBTITLE } from "@xolace/backend/convex/lib/chatNotifications";
import {
	canDelete,
	canManualRest,
} from "@xolace/backend/convex/lib/conversationGating";
import type { FunctionReturnType } from "convex/server";
import { COPY } from "../copy";

export type ConversationRow = FunctionReturnType<
	typeof api.xolacerChat.myConversations
>[number];
export type PairConversation = Extract<ConversationRow, { kind: "pair" }>;
type BroadcastConversation = Extract<ConversationRow, { kind: "broadcast" }>;
type Status = PairConversation["status"];

export type StreamSnapshot = Readonly<
	Record<string, { unread: number; lastText?: string }>
>;

export type ChipTone = "talking" | "waiting" | "neutral";

export type Badge = { label: string; a11y: string };

export type ChannelRowView = {
	kind: "broadcast";
	id: string;
	line: string;
	when: string | null;
	unread: Badge | null;
	a11y: string;
};

export type PairRowView = {
	kind: "pair";
	id: PairConversation["id"];
	conversation: PairConversation;
	name: string;
	photoUrl?: string;
	present: boolean;
	chip: { label: string; tone: ChipTone } | null;
	line: string | null;
	when: string;
	unread: Badge | null;
	requestDot: boolean;
	muted: boolean;
	a11y: string;
	menu: { archived: boolean; canClose: boolean; canDelete: boolean };
};

export type ChatRowView = ChannelRowView | PairRowView;

const UNREAD_CAP = 99;
const DAY_MS = 86_400_000;
const WEEKDAY_SPAN = 6;

function canHoldUnread(status: Status): boolean {
	return status === "open" || status === "resting";
}

export function unreadBadge(count: number): Badge | null {
	if (count <= 0) {
		return null;
	}
	return {
		a11y: COPY.row.unread(count),
		label: count > UNREAD_CAP ? `${UNREAD_CAP}+` : String(count),
	};
}

const startOfDay = (t: number) => {
	const d = new Date(t);
	d.setHours(0, 0, 0, 0);
	return d.getTime();
};

export type Clock = { locale?: string; hour12?: boolean };

export function whenLabel(
	timestamp: number,
	now: number,
	clock: Clock = {}
): string {
	const date = new Date(timestamp);
	const days = Math.round((startOfDay(now) - startOfDay(timestamp)) / DAY_MS);
	if (days <= 0) {
		return date.toLocaleTimeString(clock.locale, {
			hour: "numeric",
			hour12: clock.hour12,
			minute: "2-digit",
		});
	}
	if (days <= WEEKDAY_SPAN) {
		return date.toLocaleDateString(clock.locale, { weekday: "short" });
	}
	const sameYear = date.getFullYear() === new Date(now).getFullYear();
	return date.toLocaleDateString(clock.locale, {
		day: "numeric",
		month: "short",
		...(sameYear ? {} : { year: "numeric" }),
	});
}

function closedLine(c: PairConversation): string {
	if (c.closedReason === "declined") {
		return c.role === "xolacer"
			? COPY.line.youClosed
			: COPY.line.theyCouldnt(c.counterpartName);
	}
	if (c.closedReason === "expired") {
		return COPY.line.expired;
	}
	if (c.closedReason === "blocked" || c.closedReason === "xolacer_left") {
		return COPY.line.closed;
	}
	return COPY.line.stillHere;
}

function statusOf(
	c: PairConversation,
	lastText: string | undefined
): Pick<PairRowView, "chip" | "line" | "requestDot" | "muted"> {
	const xolacer = c.role === "xolacer";
	switch (c.status) {
		case "open":
			return {
				chip: { label: COPY.chip.talking, tone: "talking" },
				line: lastText?.trim() || null,
				muted: false,
				requestDot: false,
			};
		case "requested":
			return {
				chip: {
					label: xolacer ? COPY.chip.newRequest : COPY.chip.waiting,
					tone: "waiting",
				},
				line: xolacer
					? c.origin === "suggestion"
						? COPY.line.afterSession
						: CHAT_REQUEST_SUBTITLE
					: COPY.line.requestSent(c.counterpartName),
				muted: false,
				requestDot: xolacer,
			};
		case "resting": {
			const manual = c.restingReason === "manual";
			return {
				chip: {
					label: manual ? COPY.chip.wrappedUp : COPY.chip.resting,
					tone: "neutral",
				},
				line: manual
					? xolacer
						? COPY.line.youWrappedUp
						: COPY.line.theyWrappedUp(c.counterpartName)
					: COPY.line.quiet,
				muted: false,
				requestDot: false,
			};
		}
		default:
			return {
				chip: { label: COPY.chip.closed, tone: "neutral" },
				line: closedLine(c),
				muted: true,
				requestDot: false,
			};
	}
}

function channelRow(
	c: BroadcastConversation,
	stream: StreamSnapshot,
	now: number,
	clock: Clock
): ChannelRowView {
	const unread = unreadBadge(stream[c.streamChannelId]?.unread ?? 0);
	const last = c.lastMessageText?.trim();
	return {
		a11y: COPY.channel.a11y(unread?.a11y ?? null),
		id: c.id,
		kind: "broadcast",
		line: last ? `${COPY.channel.sub} · ${last}` : COPY.channel.sub,
		unread,
		when: c.lastMessageAt ? whenLabel(c.lastMessageAt, now, clock) : null,
	};
}

export function pairRow(
	c: PairConversation,
	stream: StreamSnapshot,
	now: number,
	clock: Clock = {}
): PairRowView {
	const live = c.streamChannelId ? stream[c.streamChannelId] : undefined;
	const status = statusOf(c, live?.lastText);
	const unread = canHoldUnread(c.status)
		? unreadBadge(live?.unread ?? 0)
		: null;
	return {
		...status,
		a11y: COPY.row.a11y({
			line: status.line,
			name: c.counterpartName,
			present: c.counterpartPresent,
			status: status.chip?.label ?? null,
			unread: unread?.a11y ?? null,
		}),
		conversation: c,
		id: c.id,
		kind: "pair",
		menu: {
			archived: c.archived,
			canClose: canManualRest(c, c.role),
			canDelete: canDelete(c),
		},
		name: c.counterpartName,
		photoUrl: c.counterpartPhotoUrl,
		present: c.counterpartPresent,
		unread,
		when: whenLabel(c.lastMessageAt ?? c.requestedAt, now, clock),
	};
}

export function chatRows(
	conversations: readonly ConversationRow[],
	stream: StreamSnapshot,
	now: number,
	clock: Clock = {}
): ChatRowView[] {
	const channel = conversations.filter(
		(c): c is BroadcastConversation => c.kind === "broadcast"
	);
	const pairs = conversations.filter(
		(c): c is PairConversation => c.kind === "pair" && !c.archived
	);
	return [
		...channel.map((c) => channelRow(c, stream, now, clock)),
		...pairs.map((c) => pairRow(c, stream, now, clock)),
	];
}

export function archivedRows(
	conversations: readonly ConversationRow[],
	stream: StreamSnapshot,
	now: number,
	clock: Clock = {}
): PairRowView[] {
	return conversations
		.filter((c): c is PairConversation => c.kind === "pair" && c.archived)
		.map((c) => pairRow(c, stream, now, clock));
}

export const archivedCount = (conversations: readonly ConversationRow[]) =>
	conversations.filter((c) => c.kind === "pair" && c.archived).length;

export function chatsEmpty(
	conversations: readonly ConversationRow[]
): "none" | "archived" | null {
	const pairs = conversations.filter((c) => c.kind === "pair");
	if (pairs.some((c) => !c.archived)) {
		return null;
	}
	return pairs.length > 0 ? "archived" : "none";
}

export type Segment = "chats" | "xolacers";

export function landingSegment(
	picked: Segment | null,
	conversations: readonly ConversationRow[]
): Segment {
	if (picked) {
		return picked;
	}
	return conversations.length > 0 ? "chats" : "xolacers";
}

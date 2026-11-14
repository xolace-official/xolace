import type { TelegramUpdate } from "@gramio/types";
import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { httpAction, internalMutation } from "../../_generated/server";
import { telegramInboundPool } from "../pools";
import { constantTimeEqual, SECRET_HEADER, sha256Hex } from "./botApi";

/**
 * The Telegram webhook (#765). Checks the secret, stores the update once
 * (deduped on `update_id`), puts it on the `telegramInbound` pool and answers
 * 200. No work happens before the 200: Telegram waits on it and resends
 * whatever it didn't get.
 */

type Fields = Record<string, unknown>;

const isObject = (value: unknown): value is Fields =>
	typeof value === "object" && value !== null;

/** Absent, or the given type. */
const optional = (value: unknown, type: "number" | "string") =>
	value === undefined || typeof value === type;

/** A chat or a user: an object with a numeric `id`. */
const hasId = (value: unknown) =>
	isObject(value) && typeof value.id === "number";

/** A chat: its `id`, and the `type` routing reads. */
const isChat = (value: unknown) =>
	hasId(value) && isObject(value) && typeof value.type === "string";

/** A sender: its `id`, and the `username` a link keeps as its handle. */
const isUser = (value: unknown) =>
	hasId(value) && isObject(value) && optional(value.username, "string");

/** A message, as far as anything here reads it. */
const isMessage = (value: unknown) =>
	isObject(value) &&
	isChat(value.chat) &&
	optional(value.text, "string") &&
	(value.from === undefined || isUser(value.from));

/** Each update kind this bot handles, checked on the fields it reads. */
function wellFormed(update: Fields): boolean {
	if (update.message !== undefined && !isMessage(update.message)) {
		return false;
	}
	const tap = update.callback_query;
	if (
		tap !== undefined &&
		!(
			isObject(tap) &&
			typeof tap.id === "string" &&
			isUser(tap.from) &&
			optional(tap.data, "string") &&
			(tap.message === undefined || isMessage(tap.message))
		)
	) {
		return false;
	}
	const member = update.my_chat_member;
	return (
		member === undefined ||
		(isObject(member) &&
			isChat(member.chat) &&
			isObject(member.new_chat_member) &&
			typeof member.new_chat_member.status === "string")
	);
}

/**
 * An update as Telegram sent it, or null when it isn't one: `update_id`, and
 * every field this bot reads on the kinds it handles, narrowed before use.
 */
export function asUpdate(value: unknown): TelegramUpdate | null {
	return isUpdate(value) ? value : null;
}

/** The checks behind {@link asUpdate}, as a guard. */
const isUpdate = (value: unknown): value is TelegramUpdate =>
	isObject(value) && typeof value.update_id === "number" && wellFormed(value);

/** What an `inbound_events` row keeps once nothing more is needed from it. */
export function strippedPayload(updateId: number) {
	return { update_id: updateId };
}

/**
 * `/start <token>` (or `/start@bot <token>`): a deep link's payload. Anything
 * after the first word is dropped with it, so a token never survives.
 */
const START_WITH_TOKEN = /^\/start(?:@\w+)?\s+(\S+)/;

/**
 * Take a link token out of an update before it's stored (#766): the text
 * keeps only `/start`, and the token comes back as its SHA-256. Any other
 * update is returned as it came.
 */
export async function redactLinkToken(
	update: TelegramUpdate
): Promise<{ linkTokenHash?: string; update: TelegramUpdate }> {
	const token = update.message?.text?.match(START_WITH_TOKEN)?.[1];
	if (!(update.message && token)) {
		return { update };
	}
	return {
		linkTokenHash: await sha256Hex(token),
		update: {
			...update,
			message: { ...update.message, entities: undefined, text: "/start" },
		},
	};
}

/** The chat an update belongs to, as a string (Telegram ids are 64-bit). */
export function updateChatId(update: TelegramUpdate): string | undefined {
	const id =
		update.message?.chat.id ??
		update.callback_query?.message?.chat.id ??
		update.callback_query?.from.id ??
		update.my_chat_member?.chat.id;
	return id === undefined ? undefined : String(id);
}

export const telegramWebhook = httpAction(async (ctx, request) => {
	const expectedHash = await ctx.runQuery(
		internal.outreach.telegram.bot.webhookSecretHash,
		{}
	);
	const provided = request.headers.get(SECRET_HEADER);
	if (
		expectedHash === null ||
		!provided ||
		!constantTimeEqual(await sha256Hex(provided), expectedHash)
	) {
		return new Response("Unauthorized", { status: 401 });
	}

	// Anything that isn't an update is dropped with a 200: on any other status
	// Telegram would resend it forever.
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return new Response(null, { status: 200 });
	}
	const update = asUpdate(body);
	if (update) {
		const redacted = await redactLinkToken(update);
		await ctx.runMutation(internal.outreach.telegram.webhook.receive, {
			externalId: updateChatId(update),
			payload: redacted.update,
			updateId: update.update_id,
			...(redacted.linkTokenHash && {
				linkTokenHash: redacted.linkTokenHash,
			}),
		});
	}
	return new Response(null, { status: 200 });
});

export const receive = internalMutation({
	args: {
		externalId: v.optional(v.string()),
		linkTokenHash: v.optional(v.string()),
		payload: v.any(),
		updateId: v.number(),
	},
	handler: async (ctx, { externalId, linkTokenHash, payload, updateId }) => {
		const providerEventId = String(updateId);
		const existing = await ctx.db
			.query("inbound_events")
			.withIndex("by_channel_event", (q) =>
				q.eq("channel", "telegram").eq("providerEventId", providerEventId)
			)
			.first();
		if (existing) {
			return null;
		}
		const eventId = await ctx.db.insert("inbound_events", {
			channel: "telegram",
			externalId: externalId ?? "",
			...(externalId && linkTokenHash && { linkTokenHash }),
			// Nothing to act on without a chat; keep only the id.
			payload: externalId ? payload : strippedPayload(updateId),
			providerEventId,
			receivedAt: Date.now(),
			status: externalId ? "received" : "ignored",
		});
		if (externalId) {
			await telegramInboundPool.enqueueAction(
				ctx,
				internal.outreach.telegram.inbound.processUpdate,
				{ eventId }
			);
		}
		return null;
	},
	returns: v.null(),
});

import { type Infer, v } from "convex/values";
import { internal } from "../../_generated/api";
import { type ActionCtx, internalAction } from "../../_generated/server";
import { botApi, TelegramApiError } from "./botApi";
import {
	EXPIRED_LINK_REPLY,
	GOODBYE_APP,
	HELP,
	LINKED_COMMANDS,
	OLD_CHAT,
	RELINKED,
	REVOKED_REPLY,
	STOP_REPLY,
	STRANGER_REPLY,
	WELCOME,
} from "./copy";

/**
 * Sending the bot's fixed lines (#765–#767). A line is decided in a
 * mutation and sent here, after it commits, never retried: no line goes out
 * twice. A 403 on a line meant for a linked chat revokes it `unreachable`.
 */

/** Telegram's "the user blocked the bot" (and other forbidden sends). */
const FORBIDDEN = 403;

const lineKindValidator = v.union(
	v.literal("expired"),
	v.literal("goodbye_app"),
	v.literal("help"),
	v.literal("old_chat"),
	v.literal("relinked"),
	v.literal("revoked"),
	v.literal("stop"),
	v.literal("stranger"),
	v.literal("welcome")
);

/** A fixed line to send, and where. */
export const lineValidator = v.object({
	chatId: v.string(),
	kind: lineKindValidator,
	/** For a line to a linked chat: that link's `linkedAt`, so a late 403 can't end a newer link. */
	linkedAt: v.optional(v.number()),
});
export type Line = Infer<typeof lineValidator>;

/**
 * Each line's text; whether the chat it goes to is linked when it was
 * decided (only then does a 403 revoke, so a late goodbye can't end a newer
 * link); and what happens to the chat's `/stop` command after it.
 */
const LINES: Record<
	Line["kind"],
	{ commands?: "delete" | "set"; text: string; toLinkedChat: boolean }
> = {
	expired: { text: EXPIRED_LINK_REPLY, toLinkedChat: false },
	goodbye_app: { commands: "delete", text: GOODBYE_APP, toLinkedChat: false },
	help: { text: HELP, toLinkedChat: true },
	old_chat: { commands: "delete", text: OLD_CHAT, toLinkedChat: false },
	relinked: { commands: "set", text: RELINKED, toLinkedChat: true },
	revoked: { text: REVOKED_REPLY, toLinkedChat: false },
	stop: { commands: "delete", text: STOP_REPLY, toLinkedChat: false },
	stranger: { text: STRANGER_REPLY, toLinkedChat: false },
	welcome: { commands: "set", text: WELCOME, toLinkedChat: true },
};

const forbidden = (error: unknown) =>
	error instanceof TelegramApiError && error.errorCode === FORBIDDEN;

async function sendLine(ctx: ActionCtx, line: Line): Promise<void> {
	try {
		await botApi.sendMessage({
			chat_id: line.chatId,
			protect_content: true,
			text: LINES[line.kind].text,
		});
	} catch (error) {
		if (forbidden(error)) {
			if (LINES[line.kind].toLinkedChat) {
				await ctx.runMutation(
					internal.outreach.telegram.lifecycle.markUnreachable,
					{ chatId: line.chatId, linkedAt: line.linkedAt }
				);
			}
			return;
		}
		// Not retried, so nothing is sent twice: log and move on.
		console.error(`Telegram ${line.kind} line failed`, error);
		return;
	}
	const scope = { chat_id: line.chatId, type: "chat" as const };
	try {
		const { commands } = LINES[line.kind];
		if (commands === "set") {
			// `/stop` shows only in linked chats.
			await botApi.setMyCommands({ commands: [...LINKED_COMMANDS], scope });
		} else if (commands === "delete") {
			// Back to the bot's default commands.
			await botApi.deleteMyCommands({ scope });
		}
	} catch (error) {
		if (!forbidden(error)) {
			console.error("Telegram chat commands failed", error);
		}
	}
}

/** Send each line in order. */
export async function sendLines(
	ctx: ActionCtx,
	lines: readonly Line[]
): Promise<void> {
	for (const line of lines) {
		await sendLine(ctx, line);
	}
}

/** `sendLines` for a mutation to schedule once it has decided. */
export const send = internalAction({
	args: { lines: v.array(lineValidator) },
	handler: async (ctx, { lines }) => {
		await sendLines(ctx, lines);
		return null;
	},
	returns: v.null(),
});

import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";
import type { LocalMessage, StreamChat } from "stream-chat";
import { toast } from "@/components/shared/toast";
import { THREAD } from "./copy";

/** The concern tray's context (`useFeedbackContext`), passed in by the route: the tray is its
 * own feature. */
export type FeedbackContext = FunctionArgs<
	typeof api.productFeedbackFlags.flagMessage
>["context"];

/** Flags one message in both places the maintainer looks: Stream's moderation queue (with the
 * user's own token) and the concern tray (`productFeedbackFlags.flagMessage`). */
export function useFlagMessage(
	conversationId: Id<"xolacer_conversations">,
	client: StreamChat | null,
	context: FeedbackContext
) {
	const flag = useMutation(api.productFeedbackFlags.flagMessage);

	return (message: LocalMessage) => {
		if (!message.id) {
			return;
		}
		Promise.allSettled([
			client
				? client.flagMessage(message.id)
				: Promise.reject(new Error("no client")),
			flag({ context, conversationId, messageId: message.id }),
		]).then(([stream, tray]) => {
			// Each half on its own: one landing still says "Flagged", so a failure would go unseen.
			if (stream.status === "rejected") {
				console.error("[connect] flag to Stream failed", stream.reason);
			}
			if (tray.status === "rejected") {
				console.error("[connect] flag to the concern tray failed", tray.reason);
			}
			const landed =
				stream.status === "fulfilled" || tray.status === "fulfilled";
			toast(landed ? THREAD.toast.flagged : THREAD.toast.flagFailed, {
				description: landed ? THREAD.toast.flaggedBody : THREAD.toast.tryAgain,
				variant: landed ? "success" : "danger",
			});
		});
	};
}

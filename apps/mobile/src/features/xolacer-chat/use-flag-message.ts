import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useMutation } from "convex/react";
import { useToast } from "heroui-native";
import type { LocalMessage } from "stream-chat";
import { useChatContext } from "stream-chat-expo";
import { useFeedbackContext } from "@/features/feedback-tray/use-feedback-context";

/** Flags one message in both places the maintainer looks: Stream's moderation queue (with the
 * user's own token) and the concern tray (`productFeedback.flagMessage`). */
export function useFlagMessage(conversationId: Id<"xolacer_conversations">) {
	const { client } = useChatContext();
	const flag = useMutation(api.productFeedbackFlags.flagMessage);
	const { toast } = useToast();
	const context = useFeedbackContext();

	return (message: LocalMessage) => {
		if (!message.id) {
			return;
		}
		Promise.allSettled([
			client.flagMessage(message.id),
			flag({
				context,
				conversationId,
				messageId: message.id,
			}),
		]).then((results) => {
			const landed = results.some((r) => r.status === "fulfilled");
			for (const r of results) {
				if (r.status === "rejected") {
					console.warn("[xolacer-chat] flag failed", r.reason);
				}
			}
			toast.show(
				landed
					? { description: "Someone will take a look.", label: "Flagged." }
					: {
							description: "Something went wrong. Try again.",
							label: "Couldn't flag this message",
						}
			);
		});
	};
}

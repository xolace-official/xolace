import BlockIcon from "@expo/material-symbols/block.xml";
import FlagIcon from "@expo/material-symbols/flag.xml";
import StarIcon from "@expo/material-symbols/star.xml";
import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useAction } from "convex/react";
import { useRouter } from "expo-router";
import { useToast } from "heroui-native";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { OverflowMenu } from "@/components/shared/overflow-menu";
import { useTray } from "@/features/feedback-tray/engine/tray-provider";
import type { Trays } from "@/features/feedback-tray/screens/registry";
import { playSoftPress } from "@/lib/haptics";

/** Overflow menu for a xolacer (thread and profile): Rate, Report, Block. Block is
 * conditionally mounted, never `hidden`: a hidden toolbar item eats touches on Android. */
export function XolacerMenu({
	profileId,
	name,
	conversationId,
	origin,
	hasHistory = true,
	rateState = "hidden",
}: {
	profileId: Id<"emotional_profiles">;
	name: string;
	conversationId?: Id<"xolacer_conversations">;
	origin: "thread" | "profile";
	/** Whether anything was ever written here — see `hasSpoken`. */
	hasHistory?: boolean;
	/** Whether to offer rating here, and in which wording — see `rateCtaState`. */
	rateState?: "hidden" | "prompt" | "rated";
}) {
	const router = useRouter();
	const { toast } = useToast();
	const { show } = useTray<Trays>();
	const blockConversation = useAction(api.xolacerChat.blockConversation);
	const [confirming, setConfirming] = useState(false);
	const [pending, setPending] = useState(false);

	const handleBlock = () => {
		if (pending || !conversationId) {
			return;
		}
		setPending(true);
		blockConversation({ conversationId })
			.then(() => {
				setConfirming(false);
				// The row is gone from the list behind us; nothing here to return to.
				router.back();
			})
			.catch((err) => {
				console.error("[xolacer-chat] block failed", err);
				// Closed, not left open mid-claim: nothing was blocked, and the server
				// is idempotent, so opening the menu again and retrying is harmless.
				setConfirming(false);
				toast.show({
					description: "Something went wrong. Try again.",
					label: "Couldn't block this conversation",
				});
			})
			.finally(() => setPending(false));
	};

	return (
		<>
			<OverflowMenu>
				{rateState !== "hidden" && conversationId && (
					<OverflowMenu.Action
						icon={process.env.EXPO_OS === "ios" ? "star" : StarIcon}
						onPress={() => {
							playSoftPress();
							router.push({
								params: { conversationId },
								pathname: "/rate/[conversationId]",
							});
						}}
					>
						{rateState === "prompt"
							? "Rate this conversation"
							: "Change your rating"}
					</OverflowMenu.Action>
				)}

				<OverflowMenu.Action
					icon={process.env.EXPO_OS === "ios" ? "flag" : FlagIcon}
					onPress={() => {
						playSoftPress();
						// A report from a profile is about the person, not an exchange, so
						// `origin` decides whether the conversation is attached.
						show("report", {
							kind: "concern",
							subject: {
								conversationId:
									origin === "thread" ? conversationId : undefined,
								name,
								profileId,
							},
						});
					}}
				>
					Report
				</OverflowMenu.Action>

				{conversationId && (
					<OverflowMenu.Action
						destructive
						icon={process.env.EXPO_OS === "ios" ? "hand.raised" : BlockIcon}
						onPress={() => {
							playSoftPress();
							setConfirming(true);
						}}
					>
						Block
					</OverflowMenu.Action>
				)}
			</OverflowMenu>

			<ConfirmationDialog
				confirmLabel="Block"
				description={
					hasHistory
						? "Neither of you will be able to send another message here, and this can't be undone. Everything already written stays."
						: "Neither of you will be able to send another message here, and this can't be undone."
				}
				isDestructive
				isLoading={pending}
				isOpen={confirming}
				onConfirm={handleBlock}
				onOpenChange={setConfirming}
				title="Block this conversation?"
			/>
		</>
	);
}

/**
 * One post's card from Stream's message context: what it shows (`postView`), and Stream's own
 * reaction toggle and hold. The card draws; Stream does.
 */
import type { GestureResponderEvent } from "react-native";
import { useMessageContext } from "stream-chat-expo";
import { playSoftPress } from "@/lib/haptics";
import { deviceClock } from "../../device-clock";
import { postView } from "../channel-model";

export function usePost() {
	const { contextMenuAnchorRef, handleToggleReaction, message, onLongPress } =
		useMessageContext();
	return {
		/** The view Stream lifts into its overlay on a hold. */
		anchor: contextMenuAnchorRef,
		/** Stream's overlay: the seven reactions above, Copy below. */
		hold: (event?: GestureResponderEvent) =>
			onLongPress({ emitter: "messageContent", event }),
		toggle: (type: string) => {
			playSoftPress();
			handleToggleReaction(type).catch((error: unknown) =>
				console.error("[connect] channel reaction failed", error)
			);
		},
		view: postView(message, Date.now(), deviceClock()),
	};
}

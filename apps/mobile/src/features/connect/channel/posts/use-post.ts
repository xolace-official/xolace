/**
 * One post's card from Stream's message context: what it shows (`postView`), and Stream's own
 * reaction toggle and hold. The card draws; Stream does.
 */
import { type GestureResponderEvent, Linking } from "react-native";
import { useMessageContext, useMessagesContext } from "stream-chat-expo";
import { playSoftPress } from "@/lib/haptics";
import { deviceClock } from "../../device-clock";
import { postView } from "../channel-model";

export function usePost() {
	const { contextMenuAnchorRef, handleToggleReaction, message, onLongPress } =
		useMessageContext();
	const { retrySendMessage } = useMessagesContext();
	return {
		/** The view Stream lifts into its overlay on a hold. */
		anchor: contextMenuAnchorRef,
		/** Stream's overlay: the seven reactions above, Copy below. */
		hold: (event?: GestureResponderEvent) =>
			onLongPress({ emitter: "messageContent", event }),
		/** A link in the post, from VoiceOver's actions (a tap goes through Stream's renderer). */
		openLink: (url: string) => {
			Linking.openURL(url).catch((error: unknown) =>
				console.error("[connect] channel link failed", error)
			);
		},
		/** Stream's resend, as its overlay's "Resend" does, for a broadcast that didn't send. */
		resend: () => {
			playSoftPress();
			retrySendMessage(message).catch((error: unknown) =>
				console.error("[connect] channel resend failed", error)
			);
		},
		toggle: (type: string) => {
			playSoftPress();
			handleToggleReaction(type).catch((error: unknown) =>
				console.error("[connect] channel reaction failed", error)
			);
		},
		view: postView(message, Date.now(), deviceClock()),
	};
}

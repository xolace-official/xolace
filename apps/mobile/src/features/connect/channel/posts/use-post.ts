import * as Sentry from "@sentry/react-native";
import { type GestureResponderEvent, Linking } from "react-native";
import { useMessageContext, useMessagesContext } from "stream-chat-expo";
import { toast } from "@/components/shared/toast";
import { playSoftPress } from "@/lib/haptics";
import { deviceClock } from "../../device-clock";
import { postView } from "../channel-model";
import { CHANNEL } from "../copy";
import { isOpenableLink } from "../post-text";

export function usePost() {
	const { contextMenuAnchorRef, handleToggleReaction, message, onLongPress } =
		useMessageContext();
	const { retrySendMessage } = useMessagesContext();
	return {
		anchor: contextMenuAnchorRef,
		hold: (event?: GestureResponderEvent) =>
			onLongPress({ emitter: "messageContent", event }),
		openLink: (url: string) => {
			if (!isOpenableLink(url)) {
				return;
			}
			Linking.openURL(url).catch((error: unknown) => {
				if (__DEV__) {
					console.error("[connect] channel link failed", error);
				}
			});
		},
		resend: () => {
			playSoftPress();
			retrySendMessage(message).catch((error: unknown) => {
				Sentry.captureException(error, { tags: { action: "channel-resend" } });
				toast(CHANNEL.resendFailed, { variant: "danger" });
			});
		},
		toggle: (type: string) => {
			playSoftPress();
			handleToggleReaction(type).catch((error: unknown) =>
				Sentry.captureException(error, {
					tags: { action: "channel-reaction" },
				})
			);
		},
		view: postView(message, Date.now(), deviceClock()),
	};
}

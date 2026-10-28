import { Asset } from "expo-asset";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	MessageAuthor,
	type MessageAuthorProps,
	MessageComposer,
	MessageFooter,
	type MessageFooterProps,
	useMessageContext,
	useOwnCapabilitiesContext,
} from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";

const LOCK_ICON = { android: "lock", ios: "lock.fill", web: "lock" } as const;

/** Replaces `<MessageComposer>` for anyone but the sender, in the channel's own voice instead
 * of Stream's generic "can't send". */
export function BroadcastComposerBar() {
	const { sendMessage: canSendMessage } = useOwnCapabilitiesContext();
	const muted = useThemeColor("muted") as string;
	const insets = useSafeAreaInsets();

	if (canSendMessage) {
		return <MessageComposer />;
	}

	// The stock composer clears the home indicator itself; this bar has to.
	return (
		<View
			className="flex-row items-center gap-2.5 border-border/40 border-t bg-surface-secondary px-4 pt-3"
			style={{ paddingBottom: Math.max(insets.bottom, 12) }}
		>
			<SymbolView name={LOCK_ICON} size={14} tintColor={muted} />
			<AppText className="flex-1 text-muted text-xs leading-4">
				Xolace only talks to the whole camp, not back, drop a reaction instead
			</AppText>
		</View>
	);
}

/** The author is a constant: `getStreamToken` re-upserts the broadcaster's Stream record as a
 * pseudonymous "Camper" on every connect. `MessageAuthor` draws the avatar, `MessageFooter`
 * the name (>2 members only). */
const CAMPFIRE_URI = Asset.fromModule(
	require("@/assets/images/flux/campfire-mini.jpeg")
).uri;

function useXolaceAuthoredMessage() {
	const { message } = useMessageContext();
	if (!message.user) {
		return message;
	}
	return {
		...message,
		user: { ...message.user, image: CAMPFIRE_URI, name: "Xolace" },
	};
}

export function BroadcastMessageAuthor(props: MessageAuthorProps) {
	return <MessageAuthor {...props} message={useXolaceAuthoredMessage()} />;
}

export function BroadcastMessageFooter(props: MessageFooterProps) {
	return <MessageFooter {...props} message={useXolaceAuthoredMessage()} />;
}

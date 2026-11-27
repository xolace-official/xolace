import { useIsFocused } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Platform, View } from "react-native";
import {
	NetworkDownIndicator,
	useChannelContext,
	useChatContext,
} from "stream-chat-expo";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { CONNECTION_GRACE_MS } from "@/lib/connection/connection-model";
import { useReach } from "@/lib/connection/use-connection";
import { useClaimOfflineMessage } from "@/lib/connection/use-offline-claim";
import { useTokenColor } from "@/lib/use-token-color";
import {
	chatStream,
	connectionStripLine,
	stripSpeech,
} from "../connection-strip-model";

const OFFLINE = { android: "wifi_off", ios: "wifi.slash" } as const;
const CANT_REACH = { android: "cloud_off", ios: "icloud.slash" } as const;

/** Whether `down` has held for the app's connection grace without a break. */
function useHeldDown(down: boolean): boolean {
	const [held, setHeld] = useState(false);
	useEffect(() => {
		setHeld(false);
		if (!down) {
			return;
		}
		const id = setTimeout(() => setHeld(true), CONNECTION_GRACE_MS);
		return () => clearTimeout(id);
	}, [down]);
	return down && held;
}

/**
 * Speaks each new strip message to VoiceOver while chat is focused. The live region covers
 * TalkBack; on iOS it does nothing, and the root banner that would announce is claimed here.
 */
function useSpokenOnIos(line: string | null): void {
	const focused = useIsFocused();
	const heard = useRef<string | null>(null);
	useEffect(() => {
		if (Platform.OS !== "ios" || !focused) {
			return;
		}
		const step = stripSpeech(heard.current, line);
		heard.current = step.heard;
		if (step.announce !== null) {
			AccessibilityInfo.announceForAccessibilityWithOptions(step.announce, {
				queue: true,
			});
		}
	}, [focused, line]);
}

/**
 * Chat's one connection message, above the composer. While it's mounted on the focused
 * screen it claims the offline message, so the root banner hides; a thread with no composer
 * (closed, or messages that never loaded) keeps the banner.
 */
export function ConnectionStrip() {
	useClaimOfflineMessage();
	const { connectionRecovering, isOnline } = useChatContext();
	const reach = useReach();
	const held = useHeldDown(isOnline === false);
	const muted = useTokenColor("muted");
	const line = connectionStripLine({
		reach,
		stream: chatStream({ held, isOnline, recovering: connectionRecovering }),
	});
	useSpokenOnIos(line);
	if (line === null) {
		return null;
	}
	return (
		<View
			accessibilityLiveRegion="polite"
			className="mx-3 mb-1.5 flex-row items-center gap-2 rounded-row bg-surface-secondary px-3.5 py-2.5"
		>
			<Icon
				color={muted}
				name={reach === "offline" ? OFFLINE : CANT_REACH}
				size={13}
			/>
			<AppText className="flex-1" color="muted" variant="footnote">
				{line}
			</AppText>
		</View>
	);
}

export function ChannelErrorIndicator() {
	const { error } = useChannelContext();
	const { isOnline } = useChatContext();
	if (!(isOnline && error)) {
		return null;
	}
	return <NetworkDownIndicator />;
}

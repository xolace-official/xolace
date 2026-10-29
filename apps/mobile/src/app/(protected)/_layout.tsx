import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";
import { ReducedMotionConfig, ReduceMotion } from "react-native-reanimated";
import { NowPlayingHost } from "@/features/browse/now-playing/now-playing-host";
import { UnreadIconBadge } from "@/features/xolacer-chat/components/unread-icon-badge";
import {
	StreamChatProvider,
	StreamOverlayProvider,
} from "@/features/xolacer-chat/providers/stream-chat-provider";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useNotifications } from "@/lib/use-notifications";
import { AppPresence } from "@/providers/app-presence";

const SCREEN_OPTIONS = {
	contentStyle: { backgroundColor: "transparent" },
	headerShown: false,
};

const NO_GESTURE = { gestureEnabled: false };

/** Skipping a rating should feel like dismissing, not navigating away. */
const RATE_OPTIONS = {
	presentation: "formSheet",
	sheetGrabberVisible: true,
} as const;

/** Like the rating sheet, but full height so every field is reachable without a drag. */
const EDIT_PROFILE_OPTIONS = {
	headerShown: true,
	presentation: "formSheet" as const,
	sheetAllowedDetents: [1],
	sheetCornerRadius: 28,
};

/** Native header kept (transparent, untitled) so the screen's Stack.Toolbar buttons have
 * somewhere to land. */
const PAYWALL_OPTIONS = {
	gestureEnabled: true,
	headerShadowVisible: false,
	headerTransparent: true,
	presentation: "fullScreenModal",
	title: "",
} as const;

const PLAYER_OPTIONS = {
	animation: "slide_from_bottom",
	presentation: "fullScreenModal",
} as const;

const CHAT_OPTIONS = {
	headerBackButtonDisplayMode: "minimal",
	headerShadowVisible: false,
	headerShown: true,
	title: "",
} as const;

export default function ProtectedLayout() {
	// Here, not at the root: an unfinished user should not pay for push. The
	// launch tap survives in the native cache, so `(intake)`'s layout discards it
	// explicitly to keep "intake wins, a pending deep link is not preserved" (T3, #234).
	useNotifications();
	const reducedMotion = useEffectiveReducedMotion();
	const background = useThemeColor("background");
	// Small native sheets sized to their rows. iOS 26 paints its own glass behind
	// a transparent screen; iOS 18 and Android show transparent literally.
	const fitSheetOptions = {
		contentStyle: isLiquidGlassAvailable()
			? undefined
			: { backgroundColor: background },
		presentation: "formSheet",
		sheetAllowedDetents: "fitToContents",
		sheetGrabberVisible: true,
	} as const;

	return (
		// Above the Stack so the message overlay can lay itself out against the
		// whole window, header included (see StreamOverlayProvider).
		<StreamOverlayProvider>
			<StreamChatProvider>
				{/* Above the Stack so presence keeps reporting whichever screen is up. */}
				<AppPresence />
				{/* The Browse track's audio, outliving the player screen (S4). */}
				<NowPlayingHost />
				<UnreadIconBadge />
				{/* Points Reanimated's "System" at the in-app tri-state. Here, not the
            root: preferences.get needs auth. */}
				<ReducedMotionConfig
					mode={reducedMotion ? ReduceMotion.Always : ReduceMotion.Never}
				/>
				<Stack screenOptions={SCREEN_OPTIONS}>
					<Stack.Screen name="index" />
					<Stack.Screen name="(tabs)" options={NO_GESTURE} />
					<Stack.Screen name="sit-with-this" options={NO_GESTURE} />
					<Stack.Screen name="peer-reflections" options={NO_GESTURE} />
					<Stack.Screen
						name="kindling-announcement"
						options={{
							animation: reducedMotion ? "fade" : "slide_from_bottom",
							gestureEnabled: false,
						}}
					/>
					<Stack.Screen name="session-end" options={NO_GESTURE} />
					<Stack.Screen name="crisis-resources" options={NO_GESTURE} />
					<Stack.Screen name="trusted-bridge" />
					<Stack.Screen
						name="voice-vent"
						options={{ animation: "fade", gestureEnabled: false }}
					/>
					<Stack.Screen name="quotes/index" />
					<Stack.Screen name="quotes/archive" />
					<Stack.Screen name="kindling/index" />
					{/* Outside `(tabs)` on purpose: the player is full-bleed, no tab bar. */}
					<Stack.Screen name="browse-player" options={PLAYER_OPTIONS} />
					{/* Not its own root group: a sibling of (protected) competes for `/` and
					    expo-router 58+ picks it first. */}
					<Stack.Screen name="upgrade" options={PAYWALL_OPTIONS} />
					<Stack.Screen name="streak-held" options={PLAYER_OPTIONS} />
					{/* The close button (or Android back) is the no-guilt dismiss. */}
					<Stack.Screen name="follow-up" options={PLAYER_OPTIONS} />
					{/* Hold-to-continue is the only way out: no swipe-dismiss here, Android
					    back swallowed in the route. */}
					<Stack.Screen
						name="browse-intro"
						options={{ ...PLAYER_OPTIONS, gestureEnabled: false }}
					/>
					{/* Reduced motion: the Lantern reader crossfades in instead of sliding
					    (#400). */}
					<Stack.Screen
						name="library/[slug]"
						options={{ animation: reducedMotion ? "fade" : "default" }}
					/>

					<Stack.Screen name="chat/[conversationId]" options={CHAT_OPTIONS} />
					<Stack.Screen name="xolace-channel" options={CHAT_OPTIONS} />
					<Stack.Screen name="xolacer/[profileId]" />
					<Stack.Screen name="xolacer-setup" />
					<Stack.Screen name="xolacer-edit" options={EDIT_PROFILE_OPTIONS} />
					<Stack.Screen name="rate/[conversationId]" options={RATE_OPTIONS} />
					<Stack.Screen name="report-reflection" options={fitSheetOptions} />
					{/* The reader stays undimmed behind it, so mode and size changes show on
					    the page live. */}
					<Stack.Screen
						name="reader-appearance"
						options={{
							...fitSheetOptions,
							sheetLargestUndimmedDetentIndex: "last",
						}}
					/>
				</Stack>
			</StreamChatProvider>
		</StreamOverlayProvider>
	);
}

import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";
import { ReducedMotionConfig, ReduceMotion } from "react-native-reanimated";
import { useBadgeUnlock } from "@/features/achievements/unlock/use-badge-unlock";
import { NowPlayingHost } from "@/features/browse/now-playing/now-playing-host";
import { rootScreensFor } from "@/features/navigation/root-screens";
import { UnreadIconBadge } from "@/features/xolacer-chat/components/unread-icon-badge";
import {
	StreamChatProvider,
	StreamOverlayProvider,
} from "@/features/xolacer-chat/providers/stream-chat-provider";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { currentShell } from "@/lib/redesign/shell";
import { NO_GESTURE, screenOptions } from "@/lib/root-screen";
import { useNotifications } from "@/lib/use-notifications";
import { AppPresence } from "@/providers/app-presence";
import { useClaimLegacyAccountFlags } from "@/store/use-account-flag";

const SCREEN_OPTIONS = {
	contentStyle: { backgroundColor: "transparent" },
	headerShown: false,
};

export default function ProtectedLayout() {
	// The first read of the launch's shell (redesign-v2), fixed from here on. A
	// host that lives in one shell only mounts below as `{shell === "v2" && <Host />}`.
	const shell = currentShell();
	// Here, not at the root: an unfinished user should not pay for push. The
	// launch tap survives in the native cache, so `(intake)`'s layout discards it
	// explicitly to keep "intake wins, a pending deep link is not preserved" (T3, #234).
	useNotifications();
	// Opens the backfill summary, then the badge unlock moment, over whatever is
	// up, when it may interrupt (#693, #701).
	useBadgeUnlock();
	useClaimLegacyAccountFlags();
	const reducedMotion = useEffectiveReducedMotion();
	const background = useThemeColor("background");
	const surface = useThemeColor("surface");
	const context = {
		background,
		liquidGlass: isLiquidGlassAvailable(),
		reducedMotion,
		surface,
	};

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
					{/* Each feature's own entries, from its `screens.ts`, for this shell. */}
					{rootScreensFor(shell).map((screen) => (
						<Stack.Screen
							key={screen.name}
							name={screen.name}
							options={screenOptions(screen, context)}
						/>
					))}
				</Stack>
			</StreamChatProvider>
		</StreamOverlayProvider>
	);
}

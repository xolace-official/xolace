import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";
import { ReducedMotionConfig, ReduceMotion } from "react-native-reanimated";
import { ROOT_HOSTS } from "@/features/navigation/hosts";
import { ROOT_SCREENS } from "@/features/navigation/root-screens";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { NO_GESTURE, screenOptions } from "@/lib/root-screen";
import {
	StreamChatProvider,
	StreamOverlayProvider,
} from "@/lib/stream-chat/stream-chat-provider";
import { UnreadIconBadge } from "@/lib/stream-chat/unread-icon-badge";
import { useNotifications } from "@/lib/use-notifications";
import { AppPresence } from "@/providers/app-presence";
import { useClaimLegacyAccountFlags } from "@/store/use-account-flag";

const NO_ANIMATION = { animation: "none" } as const;
/** The landing: it replaces "/" without a slide, and nothing sits under it to swipe to. */
const TABS_OPTIONS = { ...NO_GESTURE, ...NO_ANIMATION };

const SCREEN_OPTIONS = {
	contentStyle: { backgroundColor: "transparent" },
	headerShown: false,
};

export default function ProtectedLayout() {
	// Here, not at the root: an unfinished user should not pay for push. The
	// launch tap survives in the native cache, so `(intake)`'s layout discards it
	// explicitly to keep "intake wins, a pending deep link is not preserved" (T3, #234).
	useNotifications();
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
				<UnreadIconBadge />
				{/* Points Reanimated's "System" at the in-app tri-state. Here, not the
            root: preferences.get needs auth. */}
				<ReducedMotionConfig
					mode={reducedMotion ? ReduceMotion.Always : ReduceMotion.Never}
				/>
				<Stack screenOptions={SCREEN_OPTIONS}>
					{/* "/" hands over to the tabs at once (see its route). */}
					<Stack.Screen name="index" options={NO_ANIMATION} />
					<Stack.Screen name="(tabs)" options={TABS_OPTIONS} />
					{/* Each feature's own entries, from its `screens.ts`. */}
					{ROOT_SCREENS.map((screen) => (
						<Stack.Screen
							key={screen.name}
							name={screen.name}
							options={screenOptions(screen, context)}
						/>
					))}
					{/* Dev states (src/dev): a release build has no route here. */}
					<Stack.Protected guard={__DEV__}>
						<Stack.Screen name="dev" />
					</Stack.Protected>
				</Stack>
				{/* Overlays and listeners features add, from features/navigation/hosts.ts. */}
				{ROOT_HOSTS.map(({ name, Host }) => (
					<Host key={name} />
				))}
			</StreamChatProvider>
		</StreamOverlayProvider>
	);
}

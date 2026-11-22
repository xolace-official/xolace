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
const TABS_OPTIONS = { ...NO_GESTURE, ...NO_ANIMATION };

const SCREEN_OPTIONS = {
	contentStyle: { backgroundColor: "transparent" },
	headerShown: false,
};

export default function ProtectedLayout() {
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
		<StreamOverlayProvider>
			<StreamChatProvider>
				<AppPresence />
				<UnreadIconBadge />
				<ReducedMotionConfig
					mode={reducedMotion ? ReduceMotion.Always : ReduceMotion.Never}
				/>
				<Stack screenOptions={SCREEN_OPTIONS}>
					<Stack.Screen name="index" options={NO_ANIMATION} />
					<Stack.Screen name="(tabs)" options={TABS_OPTIONS} />
					{ROOT_SCREENS.map((screen) => (
						<Stack.Screen
							key={screen.name}
							name={screen.name}
							options={screenOptions(screen, context)}
						/>
					))}
					<Stack.Protected guard={__DEV__}>
						<Stack.Screen name="dev" />
					</Stack.Protected>
				</Stack>
				{ROOT_HOSTS.map(({ name, Host }) => (
					<Host key={name} />
				))}
			</StreamChatProvider>
		</StreamOverlayProvider>
	);
}

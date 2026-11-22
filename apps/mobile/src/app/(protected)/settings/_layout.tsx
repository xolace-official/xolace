import ArrowBack from "@expo/material-symbols/arrow_back.xml";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import { playSoftPress } from "@/lib/haptics";
import { useHeaderOptions } from "@/lib/header-options";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { fitSheet } from "@/lib/root-screen";
import { useTokenColors } from "@/lib/use-token-color";

/** Settings stack with the redesign's native header (large title, see-through on iOS, opaque on Android). Only the root gets a custom back control: a
 * nested stack root has no native one. */
const SETTINGS_OPTIONS = { title: "Settings" };
const APPEARANCE_OPTIONS = { title: "Appearance" };
const MIRROR_OPTIONS = { title: "Mirror" };
const NOTIFICATIONS_OPTIONS = { title: "Notifications" };
const DATA_OPTIONS = { title: "Privacy & Data" };
const ACCOUNT_OPTIONS = { title: "Account" };
const FOLLOW_OPTIONS = { title: "Follow & Support" };
const REACH_OPTIONS = {
	presentation: "pageSheet",
	title: "Reach me on…",
} as const;

export default function SettingsLayout() {
	const router = useRouter();
	const headerOptions = useHeaderOptions();
	const [background, surface] = useTokenColors(["background", "surface"]);
	const reducedMotion = useEffectiveReducedMotion();
	const sheetContext = {
		background,
		liquidGlass: isLiquidGlassAvailable(),
		reducedMotion,
		surface,
	};
	const deleteOptions = {
		...fitSheet(sheetContext),
		headerShown: false,
		presentation: "formSheet",
	} as const;

	return (
		<Stack screenOptions={headerOptions}>
			<Stack.Screen name="index" options={SETTINGS_OPTIONS}>
				<Stack.Toolbar placement="left">
					<Stack.Toolbar.Button
						accessibilityLabel="Back"
						icon={process.env.EXPO_OS === "ios" ? "chevron.left" : ArrowBack}
						onPress={() => {
							playSoftPress();
							router.back();
						}}
					/>
				</Stack.Toolbar>
			</Stack.Screen>
			<Stack.Screen name="appearance" options={APPEARANCE_OPTIONS} />
			<Stack.Screen name="mirror" options={MIRROR_OPTIONS} />
			<Stack.Screen name="notifications" options={NOTIFICATIONS_OPTIONS} />
			<Stack.Screen name="reach" options={REACH_OPTIONS}>
				<Stack.Toolbar placement="right">
					<Stack.Toolbar.Button
						onPress={() => {
							playSoftPress();
							router.back();
						}}
					>
						Done
					</Stack.Toolbar.Button>
				</Stack.Toolbar>
			</Stack.Screen>
			<Stack.Screen name="data" options={DATA_OPTIONS} />
			<Stack.Screen name="delete" options={deleteOptions} />
			<Stack.Screen name="account" options={ACCOUNT_OPTIONS} />
			<Stack.Screen name="follow" options={FOLLOW_OPTIONS} />
		</Stack>
	);
}

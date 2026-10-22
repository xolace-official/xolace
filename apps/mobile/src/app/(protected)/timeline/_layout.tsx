import ArrowBack from "@expo/material-symbols/arrow_back.xml";
import Settings from "@expo/material-symbols/settings.xml";
import { Stack, useRouter } from "expo-router";
import { playSoftPress } from "@/src/lib/haptics";
import { useLargeHeaderOptions } from "@/src/lib/navigation-options";

/**
 * Timeline stack layout: large header with a back control on the left (a
 * nested stack root has no native one) and a settings control on the right.
 */
const TIMELINE_OPTIONS = { title: "Your Timeline" };

export default function TimelineLayout() {
	const router = useRouter();
	const largeHeaderOptions = useLargeHeaderOptions();

	return (
		<Stack screenOptions={largeHeaderOptions}>
			<Stack.Screen name="index" options={TIMELINE_OPTIONS}>
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
				<Stack.Toolbar placement="right">
					<Stack.Toolbar.Button
						accessibilityLabel="Settings"
						icon={process.env.EXPO_OS === "ios" ? "gearshape" : Settings}
						onPress={() => {
							playSoftPress();
							router.push("/settings");
						}}
					/>
				</Stack.Toolbar>
			</Stack.Screen>
		</Stack>
	);
}

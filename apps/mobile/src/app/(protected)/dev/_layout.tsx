/** Dev states (`src/dev`), dev builds only: the `(protected)` layout routes here only
 * under `__DEV__`. This layout imports nothing from `src/dev`, so it ships empty. */
import ArrowBack from "@expo/material-symbols/arrow_back.xml";
import { router, Stack } from "expo-router";
import { playSoftPress } from "@/lib/haptics";
import { useHeaderOptions } from "@/lib/header-options";
import { goHome } from "@/lib/landing";

/** A link to one state opens over the index, so Back lists the others. */
export const unstable_settings = { initialRouteName: "index" };

const INDEX_OPTIONS = { title: "Dev states" };

const close = () => {
	playSoftPress();
	if (router.canGoBack()) {
		router.back();
	} else {
		goHome();
	}
};

export default function DevLayout() {
	const headerOptions = useHeaderOptions();

	return (
		<Stack screenOptions={headerOptions}>
			<Stack.Screen name="index" options={INDEX_OPTIONS}>
				<Stack.Toolbar placement="left">
					<Stack.Toolbar.Button
						accessibilityLabel="Close"
						icon={process.env.EXPO_OS === "ios" ? "chevron.left" : ArrowBack}
						onPress={close}
					/>
				</Stack.Toolbar>
			</Stack.Screen>
			<Stack.Screen name="[feature]/[state]" />
		</Stack>
	);
}

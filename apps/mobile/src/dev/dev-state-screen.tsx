import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { DEV_REGISTRY } from "@/dev/discovered";
import { findDevState } from "@/dev/registry";

const UNKNOWN_OPTIONS = { title: "No such state" };

/**
 * `xolace://dev/<feature>/<state>`: the state's screen on its fixtures.
 * @public Opened by its route shim's `__DEV__` require, which knip can't follow.
 */
export function DevStateScreen() {
	const { feature = "", state = "" } = useLocalSearchParams<{
		feature: string;
		state: string;
	}>();
	const found = findDevState(DEV_REGISTRY.features, feature, state);

	if (!found) {
		return (
			<ScrollView
				contentContainerClassName="gap-2 px-gutter pt-2"
				contentInsetAdjustmentBehavior="automatic"
			>
				<Stack.Screen options={UNKNOWN_OPTIONS} />
				<AppText variant="body">
					Nothing is registered at dev/{feature}/{state}.
				</AppText>
				<AppText color="muted" variant="callout">
					The index lists every state, and any file it had to leave out. A
					feature adds its own in src/features/{feature}/dev/states.tsx.
				</AppText>
			</ScrollView>
		);
	}
	const { Screen, options, title } = found;
	return (
		<>
			<Stack.Screen options={{ title, ...options }} />
			<Screen />
		</>
	);
}

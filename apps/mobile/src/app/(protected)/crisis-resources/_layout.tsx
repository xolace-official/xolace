import ArrowBack from "@expo/material-symbols/arrow_back.xml";
import { Stack } from "expo-router";
import { goBack } from "@/components/shared/back-button";
import { COPY } from "@/features/care/help/copy";
import { playSoftPress } from "@/lib/haptics";
import { useHeaderOptions } from "@/lib/header-options";

const INDEX_OPTIONS = { title: COPY.title };

export default function CrisisResourcesLayout() {
	const headerOptions = useHeaderOptions();

	return (
		<Stack screenOptions={headerOptions}>
			<Stack.Screen name="index" options={INDEX_OPTIONS}>
				<Stack.Toolbar placement="left">
					<Stack.Toolbar.Button
						accessibilityLabel="Back"
						icon={process.env.EXPO_OS === "ios" ? "chevron.left" : ArrowBack}
						onPress={() => {
							playSoftPress();
							goBack();
						}}
					/>
				</Stack.Toolbar>
			</Stack.Screen>
		</Stack>
	);
}

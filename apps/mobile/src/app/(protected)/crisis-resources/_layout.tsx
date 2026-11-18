import ArrowBack from "@expo/material-symbols/arrow_back.xml";
import { Stack, useRouter } from "expo-router";
import { COPY } from "@/features/care/help/copy";
import { playSoftPress } from "@/lib/haptics";
import { useHeaderOptions } from "@/lib/header-options";

const INDEX_OPTIONS = { title: COPY.title };

export default function CrisisResourcesLayout() {
	const router = useRouter();
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
							router.back();
						}}
					/>
				</Stack.Toolbar>
			</Stack.Screen>
		</Stack>
	);
}

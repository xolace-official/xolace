import { useLocalSearchParams } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { useState } from "react";
import { View } from "react-native";
import { ConnectData } from "@/features/connect/connect-data";
import { ConnectScreen } from "@/features/connect/connect-screen";
import { ConnectLettersCard } from "@/features/letters/connect/connect-card";

/** NativeTabs mounts every tab eagerly (no lazy option), so this is held until first focused;
 * then it stays mounted. Letters' card is composed in here: features meet in routes. */
export default function ConnectRoute() {
	const isFocused = useIsFocused();
	const { specialty, view, t, stepId } = useLocalSearchParams<{
		specialty?: string;
		view?: string;
		t?: string;
		stepId?: string;
	}>();
	const [everFocused, setEverFocused] = useState(isFocused);
	if (isFocused && !everFocused) {
		setEverFocused(true);
	}

	if (!everFocused) {
		return <View className="flex-1 bg-background" />;
	}
	return (
		<ConnectData route={{ navToken: t, specialty, stepId, view }}>
			<ConnectScreen letters={<ConnectLettersCard />} />
		</ConnectData>
	);
}

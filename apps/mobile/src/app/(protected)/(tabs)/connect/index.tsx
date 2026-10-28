import { useLocalSearchParams } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";
import { useState } from "react";
import { View } from "react-native";
import { ConnectScreen } from "@/features/xolacer-chat/components/connect-screen";

/** NativeTabs mounts every tab eagerly (no lazy option), so this is held until first focused;
 * then it stays mounted. */
export default function ConnectRoute() {
	const isFocused = useIsFocused();
	// `specialty` pre-filters the roster, `view` picks a segment outright, `t` is
	// the tap's timestamp (without it a second tap carries identical params and
	// reads as no navigation), `stepId` is the kindling twig that sent us.
	const { specialty, view, t, stepId } = useLocalSearchParams<{
		specialty?: string;
		view?: string;
		t?: string;
		stepId?: string;
	}>();
	// Latched during render so the first focused frame renders the screen, not a blank.
	const [everFocused, setEverFocused] = useState(isFocused);
	if (isFocused && !everFocused) {
		setEverFocused(true);
	}

	if (!everFocused) {
		return <View className="flex-1 bg-background" />;
	}
	return (
		<ConnectScreen
			navToken={t}
			specialty={specialty}
			stepId={stepId}
			view={view}
		/>
	);
}

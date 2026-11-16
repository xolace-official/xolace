import { useIsFocused } from "expo-router/react-navigation";
import { useState } from "react";
import { View } from "react-native";
import { ProfileScreen } from "@/features/profile/components/screens/ProfileScreen";

/** You hosts the Profile screen until You's own screen (S5) replaces it. NativeTabs mounts every
 * tab eagerly (see connect/index.tsx); held until focused so launch doesn't also run its queries. */
export default function YouRoute() {
	const isFocused = useIsFocused();
	const [everFocused, setEverFocused] = useState(isFocused);
	if (isFocused && !everFocused) {
		setEverFocused(true);
	}

	if (!everFocused) {
		return <View className="flex-1 bg-background" />;
	}
	return <ProfileScreen />;
}

import { useIsFocused } from "expo-router/react-navigation";
import { useState } from "react";
import { View } from "react-native";
import { BrowseHome } from "@/features/browse/search/browse-home";

/** Explore hosts the Browse hub until Explore's own screen (S7) replaces it. NativeTabs mounts
 * every tab eagerly (see connect/index.tsx); held until focused so Today does not also fire the
 * shelf query. */
export default function ExploreRoute() {
	const isFocused = useIsFocused();
	const [everFocused, setEverFocused] = useState(isFocused);
	if (isFocused && !everFocused) {
		setEverFocused(true);
	}

	if (!everFocused) {
		return <View className="flex-1 bg-background" />;
	}
	return <BrowseHome />;
}

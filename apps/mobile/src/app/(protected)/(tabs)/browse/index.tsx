import { useIsFocused } from "expo-router/react-navigation";
import { useState } from "react";
import { View } from "react-native";
import { BrowseHome } from "@/features/browse/search/browse-home";

/** NativeTabs mounts every tab eagerly (see connect/index.tsx); held until focused so Discovery
 * does not also fire the shelf query. */
export default function BrowseRoute() {
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

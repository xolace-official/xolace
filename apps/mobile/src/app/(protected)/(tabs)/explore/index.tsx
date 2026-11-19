import { useIsFocused } from "expo-router/react-navigation";
import { useState } from "react";
import { View } from "react-native";
import { BrowseHome } from "@/features/browse/search/browse-home";
import { HomeData } from "@/features/explore/home/home-data";
import { HomeScreen } from "@/features/explore/home/home-screen";

/** Explore: its home (S7) under Browse's search, which stays legacy for now; the two meet here.
 * NativeTabs mounts every tab eagerly (see connect/index.tsx); held until focused so Today does
 * not also fire the shelves' queries. */
export default function ExploreRoute() {
	const isFocused = useIsFocused();
	const [everFocused, setEverFocused] = useState(isFocused);
	if (isFocused && !everFocused) {
		setEverFocused(true);
	}

	if (!everFocused) {
		return <View className="flex-1 bg-background" />;
	}
	return (
		<BrowseHome>
			<HomeData>
				<HomeScreen />
			</HomeData>
		</BrowseHome>
	);
}

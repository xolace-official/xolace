import { useIsFocused } from "expo-router/react-navigation";
import { useState } from "react";
import { View } from "react-native";
import { BrowseHome } from "@/features/browse/search/browse-home";
import { HomeData } from "@/features/explore/home/home-data";
import { HomeScreen } from "@/features/explore/home/home-screen";

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

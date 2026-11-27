import { useIsFocused } from "expo-router/react-navigation";
import { useState } from "react";
import { View } from "react-native";
import { HomeData } from "@/features/explore/home/home-data";
import { HomeScreen } from "@/features/explore/home/home-screen";
import { SearchData } from "@/features/explore/search/search-data";
import { SearchHome } from "@/features/explore/search/search-home";
import { SearchResults } from "@/features/explore/search/search-results";

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
		<SearchHome
			results={(query) => (
				<SearchData query={query}>
					<SearchResults />
				</SearchData>
			)}
		>
			<HomeData>
				<HomeScreen />
			</HomeData>
		</SearchHome>
	);
}

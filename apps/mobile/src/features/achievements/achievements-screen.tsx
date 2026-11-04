// The achievements screen (#692), variant D of #684: the sparks card over
// Reddit-style category rows.

import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Stack } from "expo-router";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLargeHeaderOptions } from "@/lib/navigation-options";
import { CategoryRow } from "./category-row";
import { SparksCard } from "./sparks-card";

export function AchievementsScreen() {
	const insets = useSafeAreaInsets();
	const headerOptions = useLargeHeaderOptions();
	const overview = useQuery(api.achievements.display.overview);

	return (
		<>
			<Stack.Screen
				options={{
					...headerOptions,
					headerShown: true,
					headerTitle: "Achievements",
				}}
			/>
			{overview ? (
				<ScrollView
					className="flex-1 bg-background"
					contentContainerClassName="pt-4"
					contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
					contentInsetAdjustmentBehavior="automatic"
				>
					<SparksCard sparks={overview.sparks} />
					{overview.categories.map((category) => (
						<CategoryRow category={category} key={category.category} />
					))}
				</ScrollView>
			) : (
				<View className="flex-1 items-center justify-center bg-background">
					<ActivityIndicator accessibilityLabel="Loading achievements" />
				</View>
			)}
		</>
	);
}

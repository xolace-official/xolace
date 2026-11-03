// PROTOTYPE (#684), throwaway: never merge. Variant A's pushed detail page.
import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";
import { byId } from "@/features/achievements/prototype/catalog.prototype";
import { DetailBody } from "@/features/achievements/prototype/detail-body.prototype";

export default function AchievementDetailPrototypeRoute() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const item = byId(id);
	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerClassName="pt-10 pb-16"
		>
			<Stack.Screen
				options={{
					headerBackButtonDisplayMode: "minimal",
					headerShadowVisible: false,
					headerShown: true,
					headerTitle: "",
				}}
			/>
			{item ? <DetailBody item={item} size={240} /> : null}
		</ScrollView>
	);
}

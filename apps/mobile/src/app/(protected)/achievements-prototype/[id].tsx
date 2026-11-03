// PROTOTYPE (#684), throwaway: never merge. Variant A's pushed detail page.
import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";
import { byId } from "@/features/achievements/prototype/catalog.prototype";
import { DetailBody } from "@/features/achievements/prototype/detail-body.prototype";
import { DetailD } from "@/features/achievements/prototype/detail-d.prototype";

export default function AchievementDetailPrototypeRoute() {
	const { id, variant } = useLocalSearchParams<{
		id: string;
		variant?: string;
	}>();
	const item = byId(id);
	if (item && variant === "D") {
		return <DetailD item={item} />;
	}
	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerClassName="pt-10 pb-16"
			contentInsetAdjustmentBehavior="automatic"
		>
			<Stack.Screen
				options={{
					headerBackButtonDisplayMode: "minimal",
					headerShadowVisible: false,
					headerShown: true,
					headerTitle: "",
				}}
			/>
			{item ? (
				<DetailBody
					item={item}
					locked={variant === "D" ? "emboss" : "tint"}
					size={240}
				/>
			) : null}
		</ScrollView>
	);
}

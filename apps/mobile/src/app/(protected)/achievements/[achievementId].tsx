import { useLocalSearchParams } from "expo-router";
import { ReturnTo } from "@/lib/return-to";

export default function BadgeDetailRoute() {
	const { achievementId } = useLocalSearchParams<{ achievementId: string }>();
	return (
		<ReturnTo
			href={{ params: { open: achievementId }, pathname: "/achievements" }}
		/>
	);
}

import { useLocalSearchParams } from "expo-router";
import { ReturnTo } from "@/lib/return-to";

/**
 * The old badge detail page's path: a badge now opens in place over
 * Achievements (`?open=`), so a link here goes there.
 */
export default function BadgeDetailRoute() {
	const { achievementId } = useLocalSearchParams<{ achievementId: string }>();
	return (
		<ReturnTo
			href={{ params: { open: achievementId }, pathname: "/achievements" }}
		/>
	);
}

import { useLocalSearchParams } from "expo-router";
import { BadgeDetailScreen } from "@/features/achievements/badge-detail-screen";

export default function BadgeDetailRoute() {
	const { achievementId } = useLocalSearchParams<{ achievementId: string }>();
	return <BadgeDetailScreen achievementId={achievementId} />;
}

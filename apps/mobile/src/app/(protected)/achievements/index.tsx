import { useLocalSearchParams } from "expo-router";
import { BadgesData } from "@/features/achievements/badges/badges-data";
import { BadgesScreen } from "@/features/achievements/badges/badges-screen";

export default function AchievementsRoute() {
	const { open } = useLocalSearchParams<{ open?: string }>();
	return (
		<BadgesData>
			<BadgesScreen open={open ? { id: open } : undefined} />
		</BadgesData>
	);
}

import { useLocalSearchParams } from "expo-router";
import { BadgeShareData } from "@/features/achievements/share/badge-share-data";
import { BadgeShareSheet } from "@/features/achievements/share/badge-share-sheet";

export default function BadgeShareRoute() {
	const { id } = useLocalSearchParams<{ id: string }>();
	return (
		<BadgeShareData achievementId={id ?? ""}>
			<BadgeShareSheet />
		</BadgeShareData>
	);
}

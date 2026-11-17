import { useLocalSearchParams } from "expo-router";
import { ListData } from "@/features/lantern/lists/list-data";
import { ListScreen } from "@/features/lantern/lists/list-screen";

/** One subject from A–Z. */
export default function LanternSubjectRoute() {
	const { slug } = useLocalSearchParams<{ slug: string }>();
	return (
		<ListData of={{ subject: slug }}>
			<ListScreen />
		</ListData>
	);
}

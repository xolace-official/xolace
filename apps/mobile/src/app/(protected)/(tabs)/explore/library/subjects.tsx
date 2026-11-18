import { useLocalSearchParams } from "expo-router";
import { SubjectsData } from "@/features/lantern/subjects/subjects-data";
import { SubjectsScreen } from "@/features/lantern/subjects/subjects-screen";

/** A–Z; `?letter=` opens at that letter. */
export default function LanternSubjectsRoute() {
	const { letter } = useLocalSearchParams<{ letter?: string }>();
	return (
		<SubjectsData letter={letter}>
			<SubjectsScreen />
		</SubjectsData>
	);
}

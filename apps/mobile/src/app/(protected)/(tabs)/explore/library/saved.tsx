import { ListData } from "@/features/lantern/lists/list-data";
import { ListScreen } from "@/features/lantern/lists/list-screen";

const SAVED = { saved: true } as const;

export default function LanternSavedRoute() {
	return (
		<ListData of={SAVED}>
			<ListScreen />
		</ListData>
	);
}

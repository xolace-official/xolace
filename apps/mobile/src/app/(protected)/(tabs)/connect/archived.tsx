import { ArchivedData } from "@/features/connect/archived/archived-data";
import { ArchivedScreen } from "@/features/connect/archived/archived-screen";

export default function ArchivedRoute() {
	return (
		<ArchivedData>
			<ArchivedScreen />
		</ArchivedData>
	);
}

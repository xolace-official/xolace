import { AppearanceData } from "@/features/settings/appearance/appearance-data";
import { AppearanceScreen } from "@/features/settings/appearance/appearance-screen";

export default function AppearanceRoute() {
	return (
		<AppearanceData>
			<AppearanceScreen />
		</AppearanceData>
	);
}

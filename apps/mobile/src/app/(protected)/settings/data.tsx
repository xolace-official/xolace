import { PrivacyData } from "@/features/settings/privacy/privacy-data";
import { PrivacyScreen } from "@/features/settings/privacy/privacy-screen";

/** Privacy & Data (the route keeps production's name, `data`). */
export default function DataRoute() {
	return (
		<PrivacyData>
			<PrivacyScreen />
		</PrivacyData>
	);
}

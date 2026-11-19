import { useReceiveLetters } from "@/features/letters/settings/use-letters-settings";
import { PrivacyData } from "@/features/settings/privacy/privacy-data";
import { PrivacyScreen } from "@/features/settings/privacy/privacy-screen";

/** Privacy & Data (the route keeps production's name, `data`), with letters' opt-in composed in:
 * features meet in routes. */
export default function DataRoute() {
	const letters = useReceiveLetters();
	return (
		<PrivacyData letters={letters}>
			<PrivacyScreen />
		</PrivacyData>
	);
}

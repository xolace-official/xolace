import { useReceiveLetters } from "@/features/letters/settings/use-letters-settings";
import { PrivacyData } from "@/features/settings/privacy/privacy-data";
import { PrivacyScreen } from "@/features/settings/privacy/privacy-screen";

export default function DataRoute() {
	const letters = useReceiveLetters();
	return (
		<PrivacyData letters={letters}>
			<PrivacyScreen />
		</PrivacyData>
	);
}

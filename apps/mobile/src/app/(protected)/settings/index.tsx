import { SettingsHomeData } from "@/features/settings/home/settings-home-data";
import { SettingsHomeScreen } from "@/features/settings/home/settings-home-screen";

export default function SettingsRoute() {
	return (
		<SettingsHomeData>
			<SettingsHomeScreen />
		</SettingsHomeData>
	);
}

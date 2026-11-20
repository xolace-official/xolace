import { HOME_ACTIONS } from "@/features/settings/home/dev/fixtures";
import {
	type SettingsHome,
	SettingsHomeProvider,
} from "@/features/settings/home/settings-home-data";
import { SettingsHomeScreen } from "@/features/settings/home/settings-home-screen";

export function FixtureHome({ state }: { state: SettingsHome["state"] }) {
	return (
		<SettingsHomeProvider value={{ actions: HOME_ACTIONS, state }}>
			<SettingsHomeScreen />
		</SettingsHomeProvider>
	);
}

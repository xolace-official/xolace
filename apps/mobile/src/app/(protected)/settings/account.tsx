import { AccountData } from "@/features/settings/account/account-data";
import { AccountScreen } from "@/features/settings/account/account-screen";

type DevTools = typeof import("@/dev/dev-tools/dev-tools-section");

const dev: DevTools | null = __DEV__
	? require("@/dev/dev-tools/dev-tools-section")
	: null;

export default function AccountRoute() {
	return (
		<AccountData>
			<AccountScreen devTools={dev ? <dev.DevToolsSection /> : null} />
		</AccountData>
	);
}

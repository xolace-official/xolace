import { AccountData } from "@/features/settings/account/account-data";
import { AccountScreen } from "@/features/settings/account/account-screen";

/** Account › Dev tools ships only in dev builds: a release build folds the
 * `require` away, so `src/dev` never reaches its bundle (`devCodeInReleaseGraph`). */
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

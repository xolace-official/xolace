import { ROOT_SCREENS } from "@/features/navigation/root-screens";
import { type ScreenContext, screenOptions } from "@/lib/root-screen";

export const NATIVE_PRESENTATIONS: ReadonlySet<string> = new Set([
	"containedModal",
	"containedTransparentModal",
	"formSheet",
	"fullScreenModal",
	"modal",
	"pageSheet",
	"transparentModal",
]);

const ANY_CONTEXT: ScreenContext = {
	background: "",
	liquidGlass: false,
	reducedMotion: false,
	surface: "",
};

export const NESTED_SHEETS = ["settings/reach", "settings/delete"] as const;

export const PRESENTED_ROUTES: readonly string[] = [
	...ROOT_SCREENS.filter((screen) => {
		const presentation = screenOptions(screen, ANY_CONTEXT)?.presentation;
		return presentation !== undefined && NATIVE_PRESENTATIONS.has(presentation);
	}).map((screen) => screen.name),
	...NESTED_SHEETS,
];

const INDEX = /(^|\/)index$/;
const PARAM = /^\[[^.\]]+\]$/;
const CATCH_ALL = /^\[\.\.\.[^\]]+\]$/;

/** Whether expo-router's `pathname` (groups stripped) is the route named `name`. */
export function routeMatches(name: string, pathname: string): boolean {
	const want = name.replace(INDEX, "").split("/").filter(Boolean);
	const have = pathname.split("/").filter(Boolean);
	for (const [i, part] of want.entries()) {
		if (CATCH_ALL.test(part)) {
			return have.length > i;
		}
		const seg = have[i];
		if (seg === undefined || !(PARAM.test(part) || part === seg)) {
			return false;
		}
	}
	return have.length === want.length;
}

export const isPresentedRoute = (pathname: string): boolean =>
	PRESENTED_ROUTES.some((name) => routeMatches(name, pathname));

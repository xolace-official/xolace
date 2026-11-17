import { ROOT_SCREENS } from "@/features/navigation/root-screens";
import { type ScreenContext, screenOptions } from "@/lib/root-screen";

/**
 * Presentations the native stack shows above everything drawn after it, hosts
 * included (`hosts.ts`): a host's overlay would play unseen behind them.
 */
const NATIVE_PRESENTATIONS: ReadonlySet<string> = new Set([
	"containedModal",
	"containedTransparentModal",
	"formSheet",
	"fullScreenModal",
	"modal",
	"pageSheet",
	"transparentModal",
]);

/** No root screen's presentation depends on the theme or motion, so any context reads it. */
const ANY_CONTEXT: ScreenContext = {
	background: "",
	liquidGlass: false,
	reducedMotion: false,
	surface: "",
};

/**
 * Sheets a nested layout presents, which `ROOT_SCREENS` can't see. Each must be
 * a route (`presented-routes.test.ts`); add one when a nested layout presents a
 * screen natively.
 */
export const NESTED_SHEETS = [
	// Reach me on…, a page sheet over Notifications (`settings/_layout.tsx`).
	"settings/reach",
] as const;

/** Every route the native stack presents over the app, as route names (`chat/[conversationId]`). */
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

/**
 * Whether a natively presented screen (a form sheet, a page sheet, a modal) is
 * up at `pathname`. Separate from `held-routes.ts`, which also decides what a
 * notification tap may tear down.
 */
export const isPresentedRoute = (pathname: string): boolean =>
	PRESENTED_ROUTES.some((name) => routeMatches(name, pathname));

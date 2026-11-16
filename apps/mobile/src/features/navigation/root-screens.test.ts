import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT_SCREENS } from "@/features/navigation/root-screens";
import { DETACHED_SHEET, fitSheet, screenOptions } from "@/lib/root-screen";

const PROTECTED = path.resolve(import.meta.dirname, "../../app/(protected)");

/** Metro's platform variants: a route can exist only as `foo.ios.tsx`. */
const ROUTE_FILES = [".tsx", ".ios.tsx", ".android.tsx", ".native.tsx"];

/** A stack entry names a route file (`quotes/index`) or a folder with its own layout. */
const routeExists = (name: string) =>
	ROUTE_FILES.some(
		(ext) =>
			existsSync(path.join(PROTECTED, `${name}${ext}`)) ||
			existsSync(path.join(PROTECTED, name, `_layout${ext}`))
	);

describe("ROOT_SCREENS", () => {
	it("names only routes that exist under (protected)", () => {
		const missing = ROOT_SCREENS.map((s) => s.name).filter(
			(name) => !routeExists(name)
		);
		expect(missing).toEqual([]);
	});

	it("lists each route once, apart from the two the layout lists itself", () => {
		const names = ROOT_SCREENS.map((s) => s.name);
		const repeated = names.filter((name, i) => names.indexOf(name) !== i);
		expect(repeated).toEqual([]);
		expect(names).not.toContain("index");
		expect(names).not.toContain("(tabs)");
	});
});

const ON_GLASS = {
	background: "#000",
	liquidGlass: true,
	reducedMotion: false,
	surface: "#111",
};
const REDUCED = {
	background: "#000",
	liquidGlass: false,
	reducedMotion: true,
	surface: "#111",
};

/**
 * The 28 entries `(protected)/_layout.tsx` listed by hand before `screens.ts`
 * (#792), with the options each resolved to, as literals: a change to a shared
 * preset shows up here. Changing a route's presentation on purpose? Edit its pin.
 */
const PLAYER = {
	animation: "slide_from_bottom",
	presentation: "fullScreenModal",
};
const TOOLBAR = {
	headerBackVisible: false,
	headerShadowVisible: false,
	headerShown: true,
	headerTransparent: true,
	title: "",
};
const CHAT = {
	headerBackButtonDisplayMode: "minimal",
	headerShadowVisible: false,
	headerShown: true,
	title: "",
};
const NO_GESTURE = { gestureEnabled: false };
const SHEET = {
	presentation: "formSheet",
	sheetAllowedDetents: "fitToContents",
	sheetGrabberVisible: true,
};
const pinned = (reduced: boolean, glass: boolean) => {
	const fit = {
		...SHEET,
		contentStyle: glass ? undefined : { backgroundColor: "#000" },
	};
	const rise = reduced ? "fade" : "slide_from_bottom";
	return {
		"badge-backfill": { ...PLAYER, ...TOOLBAR, animation: rise },
		"badge-unlock": { ...PLAYER, ...TOOLBAR, animation: rise },
		"browse-intro": { ...PLAYER, gestureEnabled: false },
		"browse-player": PLAYER,
		"chat/[conversationId]": CHAT,
		"crisis-resources": NO_GESTURE,
		"follow-up": PLAYER,
		"intake-plus-preview": PLAYER,
		"kindling-announcement": { animation: rise, gestureEnabled: false },
		"kindling/index": undefined,
		"library/[slug]": { animation: reduced ? "fade" : "default" },
		"peer-reflections": NO_GESTURE,
		"quotes/archive": undefined,
		"quotes/index": undefined,
		"rate/[conversationId]": {
			presentation: "formSheet",
			sheetGrabberVisible: true,
		},
		"reader-appearance": { ...fit, sheetLargestUndimmedDetentIndex: "last" },
		"report-reflection": fit,
		"session-end": NO_GESTURE,
		"sit-with-this": NO_GESTURE,
		"steadiness-face-info": fit,
		"streak-held": PLAYER,
		"trusted-bridge": undefined,
		upgrade: {
			gestureEnabled: true,
			headerShadowVisible: false,
			headerTransparent: true,
			presentation: "fullScreenModal",
			title: "",
		},
		"voice-vent": { animation: "fade", gestureEnabled: false },
		"xolace-channel": CHAT,
		"xolacer-edit": {
			headerShown: true,
			presentation: "formSheet",
			sheetAllowedDetents: [1],
			sheetCornerRadius: 28,
		},
		"xolacer-setup": undefined,
		"xolacer/[profileId]": undefined,
	};
};

describe("the routes the layout used to list by hand", () => {
	for (const context of [ON_GLASS, REDUCED]) {
		it(`keep their options (reduced motion ${context.reducedMotion}, glass ${context.liquidGlass})`, () => {
			const expected = pinned(context.reducedMotion, context.liquidGlass);
			const actual = Object.fromEntries(
				ROOT_SCREENS.filter((s) => Object.hasOwn(expected, s.name)).map((s) => [
					s.name,
					screenOptions(s, context),
				])
			);
			expect(actual).toStrictEqual(expected);
		});
	}
});

describe("fitSheet, the redesign's form sheet", () => {
	it("fits its content on the surface, with a grabber and 40 pt corners, glass or not", () => {
		for (const context of [ON_GLASS, REDUCED]) {
			expect(fitSheet(context)).toStrictEqual({
				contentStyle: { backgroundColor: "#111" },
				presentation: "formSheet",
				sheetAllowedDetents: "fitToContents",
				sheetCornerRadius: 40,
				sheetGrabberVisible: true,
			});
		}
	});
});

describe("DETACHED_SHEET, the route under a DetachedSheet", () => {
	it("is a transparent modal with no animation of its own", () => {
		expect(DETACHED_SHEET).toStrictEqual({
			animation: "none",
			contentStyle: { backgroundColor: "transparent" },
			presentation: "transparentModal",
		});
	});
});

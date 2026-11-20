import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT_SCREENS } from "@/features/navigation/root-screens";
import { DETACHED_SHEET, fitSheet, screenOptions } from "@/lib/root-screen";

const PROTECTED = path.resolve(import.meta.dirname, "../../app/(protected)");

const ROUTE_FILES = [".tsx", ".ios.tsx", ".android.tsx", ".native.tsx"];

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

const PLAYER = {
	animation: "slide_from_bottom",
	presentation: "fullScreenModal",
};
const CHAT = {
	headerBackButtonDisplayMode: "minimal",
	headerShadowVisible: false,
	headerShown: true,
	title: "",
};
const NO_GESTURE = { gestureEnabled: false };
const FIT_SHEET = {
	contentStyle: { backgroundColor: "#111" },
	presentation: "formSheet",
	sheetAllowedDetents: "fitToContents",
	sheetCornerRadius: 40,
	sheetGrabberVisible: true,
};
const pinned = (reduced: boolean) => {
	const rise = reduced ? "fade" : "slide_from_bottom";
	return {
		"browse-intro": { ...PLAYER, gestureEnabled: false },
		"browse-player": { animation: "none" },
		"chat/[conversationId]": CHAT,
		"crisis-resources": NO_GESTURE,
		"follow-up": { animation: "none" },
		"kindling/index": undefined,
		"lantern-welcome": { ...PLAYER, gestureEnabled: false },
		"library/[slug]": { animation: reduced ? "fade" : "default" },
		"peer-reflections": NO_GESTURE,
		player: { animation: rise, presentation: "transparentModal" },
		"quotes/archive": undefined,
		"quotes/index": undefined,
		"rate/[conversationId]": FIT_SHEET,
		"reader-appearance": {
			...FIT_SHEET,
			sheetLargestUndimmedDetentIndex: "last",
		},
		"report-reflection": FIT_SHEET,
		"session-end": NO_GESTURE,
		"sit-with-this": NO_GESTURE,
		"steadiness-face-info": FIT_SHEET,
		"streak-held": { animation: "none" },
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
			...FIT_SHEET,
			headerShown: true,
			sheetAllowedDetents: [1],
		},
		"xolacer-setup": undefined,
		"xolacer/[profileId]": undefined,
	};
};

describe("the routes the layout used to list by hand", () => {
	for (const context of [ON_GLASS, REDUCED]) {
		it(`keep their options (reduced motion ${context.reducedMotion}, glass ${context.liquidGlass})`, () => {
			const expected = pinned(context.reducedMotion);
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

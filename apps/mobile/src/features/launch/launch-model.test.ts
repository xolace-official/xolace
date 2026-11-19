import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NATIVE_SPLASH } from "../../../native-splash";
import {
	COVER_CLASS,
	coverMayLeave,
	type HoldReason,
	initialLaunch,
	isRevealed,
	LAUNCH_TIMING,
	type LaunchState,
	LOGO_BOX,
	launchStep,
	logoBox,
} from "./launch-model";

const ROOT = join(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

/** The splash options, after checking app.config.ts passes them to the plugin as they are. */
function splash() {
	expect(read("app.config.ts")).toMatch(
		/"expo-splash-screen",\s*NATIVE_SPLASH\]/
	);
	return NATIVE_SPLASH;
}

/** `--color-launch-<scheme>` in global.css. */
const launchToken = (scheme: string) =>
	read("src/global.css")
		.match(new RegExp(`--color-launch-${scheme}:\\s*(#[0-9a-f]{6})`, "i"))?.[1]
		?.toUpperCase();

/** `--background` of the Default theme's light and dark variants, the first two in the file. */
const defaultBackgrounds = () =>
	[
		...read("src/themes/themes.generated.css").matchAll(
			/--background:\s*(#[0-9a-f]{6})/gi
		),
	]
		.slice(0, 2)
		.map((m) => m[1]?.toUpperCase());

describe("the launch cover matches the native splash", () => {
	it("draws the cover in the splash's colours, which are the Default theme's backgrounds", () => {
		const s = splash();
		const [light, dark] = defaultBackgrounds();
		expect(s.backgroundColor.toUpperCase()).toBe(light);
		expect(s.dark.backgroundColor.toUpperCase()).toBe(dark);
		expect(launchToken("light")).toBe(light);
		expect(launchToken("dark")).toBe(dark);
		expect(COVER_CLASS).toEqual({
			dark: "bg-launch-dark",
			light: "bg-launch-light",
		});
	});

	it("uses the splash's box: 200 pt on iOS, 76 dp on Android", () => {
		const s = splash();
		expect(s.imageWidth).toBe(LOGO_BOX.ios);
		expect(s.android.imageWidth).toBe(LOGO_BOX.android);
		expect(logoBox("ios")).toBe(200);
		expect(logoBox("android")).toBe(76);
	});

	it("draws the one splash image, light and dark", () => {
		const s = splash();
		const cover = read("src/features/launch/launch-cover.tsx");
		expect(s.dark.image).toBe(s.image);
		expect(cover).toContain(s.image.replace("./", "@/"));
	});
});

const up = (holds: HoldReason[] = []): LaunchState => ({
	...initialLaunch("dark"),
	holds,
});

describe("launchStep", () => {
	it("starts up, in the phone's scheme, with nothing holding it", () => {
		expect(initialLaunch("light")).toEqual({
			holds: [],
			phase: "cover",
			run: 0,
			scheme: "light",
		});
	});

	it("counts holds while the cover is up, and releases one at a time", () => {
		const held = launchStep(
			launchStep(up(), { reason: "gate", type: "hold" }),
			{
				reason: "gate",
				type: "hold",
			}
		);
		expect(held.holds).toEqual(["gate", "gate"]);
		const once = launchStep(held, { reason: "gate", type: "release" });
		expect(once.holds).toEqual(["gate"]);
	});

	it("ignores a release with no matching hold", () => {
		const state = up(["fonts"]);
		expect(launchStep(state, { reason: "gate", type: "release" })).toBe(state);
	});

	it("takes no hold once the cover is leaving or gone: a step shows its own loading", () => {
		for (const phase of ["exiting", "gone"] as const) {
			const state = { ...up(), phase };
			expect(launchStep(state, { reason: "bootstrap", type: "hold" })).toBe(
				state
			);
		}
	});

	it("leaves once, then is gone once it has faded", () => {
		const leaving = launchStep(up(), { type: "leave" });
		expect(leaving.phase).toBe("exiting");
		expect(launchStep(leaving, { type: "leave" })).toBe(leaving);
		expect(launchStep(leaving, { type: "done" }).phase).toBe("gone");
	});

	it("is never gone without leaving first", () => {
		const state = up();
		expect(launchStep(state, { type: "done" })).toBe(state);
	});

	it("comes back up for a dev replay, in the scheme it is given, from its first frame", () => {
		const gone = { ...up(), phase: "gone" as const };
		expect(launchStep(gone, { scheme: "light", type: "replay" })).toEqual({
			holds: [],
			phase: "cover",
			run: 1,
			scheme: "light",
		});
	});
});

describe("coverMayLeave", () => {
	it("leaves when nothing holds it", () => {
		expect(coverMayLeave([], false)).toBe(true);
	});

	it("waits while anything holds it", () => {
		expect(coverMayLeave(["gate"], false)).toBe(false);
	});

	it("leaves anyway once it has been up for maxCoverMs", () => {
		expect(coverMayLeave(["gate", "bootstrap"], true)).toBe(true);
	});

	it("never outlasts the timeout by more than the settle and the exit", () => {
		const { maxCoverMs, settleMs, exitMs } = LAUNCH_TIMING;
		expect(maxCoverMs + settleMs + exitMs).toBeLessThan(10_000);
	});
});

describe("isRevealed", () => {
	it("reveals as the cover starts leaving, not when it has gone", () => {
		expect(isRevealed("cover")).toBe(false);
		expect(isRevealed("exiting")).toBe(true);
		expect(isRevealed("gone")).toBe(true);
	});
});

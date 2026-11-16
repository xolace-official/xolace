import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const config: unknown = require("../fingerprint.config.js");
const packageJson: Record<string, unknown> = JSON.parse(
	readFileSync(new URL("../package.json", import.meta.url), "utf8")
);

// Fields the fingerprint already covers (`scripts`, the resolved `expo` config,
// native modules from the dependency lists) or that no native build reads.
const COVERED_OR_JS_ONLY_KEYS = new Set([
	"dependencies",
	"devDependencies",
	"expo",
	"main",
	"name",
	"private",
	"scripts",
	"version",
]);

function hashedContents(): Map<string, string> {
	const sources =
		typeof config === "object" && config !== null && "extraSources" in config
			? config.extraSources
			: [];
	const contents = new Map<string, string>();
	if (!Array.isArray(sources)) {
		return contents;
	}
	for (const source of sources) {
		if (source?.type === "contents" && typeof source.contents === "string") {
			contents.set(source.id, source.contents);
		}
	}
	return contents;
}

describe("fingerprint.config", () => {
	it("hashes every package.json field a native build may read", () => {
		const hashed = hashedContents();
		const unhashed = Object.keys(packageJson).filter(
			(key) =>
				!(COVERED_OR_JS_ONLY_KEYS.has(key) || hashed.has(`packageJson:${key}`))
		);
		expect(unhashed).toEqual([]);
	});

	it("hashes Reanimated's static feature flags as they are", () => {
		const reanimated = hashedContents().get("packageJson:reanimated");
		expect(reanimated).toBe(JSON.stringify(packageJson.reanimated));
		expect(JSON.parse(reanimated ?? "null")).toEqual({
			staticFeatureFlags: {
				ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS: true,
				IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS: true,
			},
		});
	});
});

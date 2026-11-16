/** File helpers shared by the theme tests. */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const root = join(import.meta.dirname, "../..");
const DECLARED = /(--[a-z0-9-]+)\s*:/g;
const SOURCE_FILE = /\.tsx?$/;

/** A file in apps/mobile, by its path from there. */
export const read = (path: string) => readFileSync(join(root, path), "utf8");

/** Every custom property a stylesheet declares. */
export const declared = (css: string) =>
	new Set([...css.matchAll(DECLARED)].map((m) => m[1]));

/** heroui-native's own stylesheets. */
export const heroStyles = join(
	dirname(createRequire(import.meta.url).resolve("heroui-native/package.json")),
	"src/styles"
);

/** The app's TypeScript sources, without the read-only sample copies. */
export function sourceFiles(dir = join(root, "src")): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) {
			return name === "sample-codes" ? [] : sourceFiles(path);
		}
		return SOURCE_FILE.test(name) ? [path] : [];
	});
}

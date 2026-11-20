import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const root = join(import.meta.dirname, "../..");
const DECLARED = /(--[a-z0-9-]+)\s*:/g;
const SOURCE_FILE = /\.tsx?$/;

export const read = (path: string) => readFileSync(join(root, path), "utf8");

export const declared = (css: string) =>
	new Set([...css.matchAll(DECLARED)].map((m) => m[1]));

export const heroStyles = join(
	dirname(createRequire(import.meta.url).resolve("heroui-native/package.json")),
	"src/styles"
);

export function sourceFiles(dir = join(root, "src")): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) {
			return name === "sample-codes" ? [] : sourceFiles(path);
		}
		return SOURCE_FILE.test(name) ? [path] : [];
	});
}

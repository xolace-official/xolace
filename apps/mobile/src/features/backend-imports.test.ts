import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	backendImportsOffList,
	serverOnlyCodeReached,
	staleBackendListings,
} from "@/features/backend-imports";
import { type Import, type ImportGraph, SRC } from "@/features/import-graph";

const file = (rel: string) => path.join(SRC, rel);

const backend = (specifier: string, typeOnly = false): Import => ({
	devOnly: false,
	names: typeOnly ? [] : ["x"],
	specifier,
	targets: [],
	typeOnly,
});

const graphOf = (entries: Record<string, Import[]>): ImportGraph =>
	new Map(
		Object.entries(entries).map(([rel, imports]) => [file(rel), imports])
	);

describe("backendImportsOffList", () => {
	it("allows the api, the data model, shared and the listed client-safe modules", () => {
		const graph = graphOf({
			"features/a/a.ts": [
				backend("@xolace/backend/api"),
				backend("@xolace/backend/shared"),
				backend("@xolace/backend/convex/lib/specialties"),
			],
		});
		expect(backendImportsOffList(graph)).toEqual([]);
	});

	it("flags a value import from any other backend module, but not a type import", () => {
		const graph = graphOf({
			"lib/talk/use-talk-style.ts": [
				backend("@xolace/backend/convex/lib/voices"),
				backend("@xolace/backend/convex/ai/prompts/companion", true),
			],
		});
		expect(backendImportsOffList(graph)).toEqual([
			"lib/talk/use-talk-style.ts -> @xolace/backend/convex/lib/voices",
		]);
	});
});

describe("staleBackendListings", () => {
	it("names a listed module no app file imports any more", () => {
		const graph = graphOf({
			"features/a/a.ts": [backend("@xolace/backend/convex/lib/specialties")],
		});
		expect(staleBackendListings(graph)).toContain(
			"@xolace/backend/convex/lib/validators"
		);
		expect(staleBackendListings(graph)).not.toContain(
			"@xolace/backend/convex/lib/specialties"
		);
	});
});

describe("serverOnlyCodeReached", () => {
	const root = "/repo/packages/backend/convex";
	const sources = (files: Record<string, string>) => (f: string) =>
		files[f.replace(`${root}/`, "")];

	it("follows runtime imports to the ElevenLabs ids, a Node action or an env read", () => {
		const read = sources({
			"c.ts": '"use node";\nexport const key = process.env.KEY;',
			"lib/a.ts": 'import { b } from "./b";\nimport { c } from "../c";',
			"lib/b.ts": 'import { id } from "./elevenLabsVoices";',
			"lib/elevenLabsVoices.ts": "export const id = 1;",
		});
		expect(serverOnlyCodeReached([`${root}/lib/a.ts`], read)).toEqual([
			"convex/c.ts",
			"convex/lib/elevenLabsVoices.ts",
		]);
	});

	it("ignores type-only imports, which Metro drops", () => {
		const read = sources({
			"lib/a.ts": 'import type { id } from "./elevenLabsVoices";',
			"lib/elevenLabsVoices.ts": "export const id = 1;",
		});
		expect(serverOnlyCodeReached([`${root}/lib/a.ts`], read)).toEqual([]);
	});
});

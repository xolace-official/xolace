import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AGE_PROMPT_VERSIONS, type AgeGateSurface } from "./age-gate-step";
import { AGE } from "./copy";

const pin = (copy: unknown) =>
	createHash("sha256").update(JSON.stringify(copy)).digest("hex").slice(0, 16);

const PINNED: Record<string, string> = {
	"letters.v1": "afa08c4e68f47f15",
	"xolacer_chat.v1": "126a7972d209fd7b",
};

const askCopy = (surface: AgeGateSurface) => {
	const { private: kept, ...ask } = AGE.ask;
	return { ...ask, private: kept[surface] };
};

describe("AGE_PROMPT_VERSIONS", () => {
	it.each(Object.keys(AGE_PROMPT_VERSIONS) as AgeGateSurface[])(
		"names the exact date-of-birth wording %s shows",
		(surface) => {
			const version = AGE_PROMPT_VERSIONS[surface];
			expect(
				pin(askCopy(surface)),
				`The ${surface} date-of-birth wording changed: bump AGE_PROMPT_VERSIONS.${surface} and pin the new text under the new version.`
			).toBe(PINNED[version]);
		}
	);
});

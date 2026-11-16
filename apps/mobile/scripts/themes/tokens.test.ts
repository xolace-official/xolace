import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REQUIRED } from "./build";
import { declared, heroStyles, read, sourceFiles } from "./test-files";

const COLOR_LITERAL = /["'`](--color-[a-z0-9-]*[a-z0-9])["'`]/g;
/** A colour utility (`bg-accent-lip`, `border-b-default-lip/50`, `dark:text-muted`) and its token. */
const COLOR_UTILITY =
	/(?<![\w-])(?:bg|text|border(?:-[trblxyse])?|ring|fill|stroke|from|via|to|outline|divide|decoration|caret|placeholder|shadow)-([a-z][a-z0-9-]*[a-z0-9])(?:\/\d+)?(?![\w-])/g;

/** Class-name tokens the hand-written CSS declared (global.css, playful.css); old screens still use them. */
const PRODUCTION_COLOR_TOKENS = [
	"accent-lip",
	"archive-tint-1",
	"archive-tint-2",
	"archive-tint-3",
	"archive-tint-4",
	"browse-audio",
	"browse-audio-foreground",
	"browse-music",
	"browse-music-foreground",
	"browse-topics",
	"browse-topics-foreground",
	"cover-ink",
	"cover-scrim",
	"danger-lip",
	"default-lip",
	"ember",
	"event",
	"event-foreground",
	"face-blush",
	"face-brow",
	"face-highlight",
	"face-highlight-clear",
	"face-pupil",
	"face-sclera",
	"frost",
	"frost-text",
	"offer-ink",
	"player-ink",
	"player-scrim",
	"plus-night",
	"poster-chip",
	"poster-deck",
	"poster-field",
	"poster-hairline",
	"poster-ink",
	"poster-ink-deep",
	"poster-ink-faint",
	"poster-ink-soft",
	"poster-paper",
	"poster-plate",
	"poster-resonate",
	"poster-send",
	"poster-shadow",
	"reader-night-bg",
	"reader-night-ink",
	"reader-night-muted",
	"reader-paper-bg",
	"reader-paper-ink",
	"reader-paper-muted",
	"resonance",
	"resonance-foreground",
	"tone-direct",
	"tone-direct-text",
	"tone-gentle",
	"tone-gentle-text",
	"tone-poetic",
	"tone-poetic-text",
	"tone-witnessed",
	"tone-witnessed-text",
	"warning-lip",
	...["ash", "sage", "vesper", "wren"].flatMap((v) =>
		["light", "mid", "deep"].map((s) => `orb-${v}-${s}`)
	),
	"orb-base",
	"orb-rim",
	"orb-sheen",
	"orb-sheen-clear",
];

const tokens = new Set([
	...declared(read("src/global.css")),
	...declared(readFileSync(join(heroStyles, "theme.css"), "utf8")),
]);
const sources = sourceFiles().map((file) => readFileSync(file, "utf8"));

describe("token names old screens use", () => {
	it("keeps every class-name token the hand-written CSS declared", () => {
		const lost = PRODUCTION_COLOR_TOKENS.filter(
			(t) => !tokens.has(`--color-${t}`)
		);
		expect(lost).toEqual([]);
	});

	it("declares every --color-* name the source reads by string", () => {
		// The heatmap's default ramp token predates the generator and is always overridden.
		const known = new Set(["--color-chart-1", "--color-chart-3"]);
		const missing = new Set<string>();
		for (const source of sources) {
			for (const [, name] of source.matchAll(COLOR_LITERAL)) {
				if (!(tokens.has(name) || known.has(name))) {
					missing.add(name);
				}
			}
		}
		expect([...missing]).toEqual([]);
	});

	it("maps a class name for every theme variable a className uses", () => {
		const themed = new Set(REQUIRED);
		const unmapped = new Set<string>();
		for (const source of sources) {
			for (const [, name] of source.matchAll(COLOR_UTILITY)) {
				if (themed.has(name) && !tokens.has(`--color-${name}`)) {
					unmapped.add(name);
				}
			}
		}
		expect([...unmapped]).toEqual([]);
	});
});

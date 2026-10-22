import { describe, expect, it } from "vitest";

import {
	attributionLines,
	headerCredit,
	metaLabel,
	prepareBody,
} from "./reader-copy";

describe("prepareBody", () => {
	it("drops a leading h1 — the cover already carries the title", () => {
		expect(prepareBody("# What burnout is\n\nBody text.")).toBe("Body text.");
	});

	it("keeps an h1 that is not the first line", () => {
		expect(prepareBody("Intro.\n\n# Later")).toBe("Intro.\n\n# Later");
	});

	it("turns a GFM alert marker into a bold label on its own line inside the quote", () => {
		expect(prepareBody("> [!TIP]\n> Write it down.")).toBe(
			"> **Tip**\n>\n> Write it down."
		);
		expect(prepareBody(">[!caution]\n> Careful.")).toBe(
			"> **Caution**\n>\n> Careful."
		);
	});

	it("leaves ordinary blockquotes alone", () => {
		expect(prepareBody("> Just a quote.")).toBe("> Just a quote.");
	});
});

const src = (
	name: string,
	extra: Partial<{
		logoUrl: string;
		pageUrl: string;
		author: string;
		attributionText: string;
	}> = {}
) => ({
	attributionText: `${name} licence`,
	name,
	pageTitle: `${name} page`,
	url: `https://${name}.test`,
	...extra,
});

describe("headerCredit", () => {
	it("verbatim credits its one publisher, linked to the page", () => {
		const nhs = src("NHS", {
			author: "Jo",
			logoUrl: "logo",
			pageUrl: "https://NHS.test/p",
		});
		expect(headerCredit({ reuse: "verbatim", sources: [nhs] })).toEqual({
			href: "https://NHS.test/p",
			line: "Published as they wrote it · by Jo",
			logoUrl: "logo",
			name: "NHS",
			xolace: false,
		});
	});

	it("adapted credits Xolace, never a publisher, however many sources", () => {
		const one = headerCredit({
			reuse: "adapted",
			sources: [src("NHS", { logoUrl: "logo" })],
		});
		expect(one).toEqual({
			line: "Adapted by Xolace",
			name: "Xolace",
			xolace: true,
		});
		expect(
			headerCredit({ reuse: "adapted", sources: [src("NHS"), src("Mind")] })
		).toEqual(one);
	});

	it("original is written for Lantern", () => {
		expect(headerCredit({ reuse: "original", sources: [] })).toEqual({
			line: "Written for Lantern",
			name: "Xolace",
			xolace: true,
		});
	});
});

describe("attributionLines", () => {
	it("gives each licence line once, in source order", () => {
		expect(attributionLines([src("NHS"), src("Mind"), src("NHS")])).toEqual([
			"NHS licence",
			"Mind licence",
		]);
	});

	it("falls back to Xolace's own line when there are no sources", () => {
		expect(attributionLines([])).toEqual(["© Xolace"]);
	});
});

describe("metaLabel", () => {
	const base = { kind: "advice" as const, readMin: 4 };
	it("names the publisher only for verbatim", () => {
		expect(
			metaLabel({ ...base, reuse: "verbatim", sources: [src("NHS")] })
		).toBe("Advice, from NHS, 4 min read");
		expect(
			metaLabel({ ...base, reuse: "adapted", sources: [src("NHS")] })
		).toBe("Advice, adapted by Xolace, 4 min read");
		expect(metaLabel({ ...base, reuse: "original", sources: [] })).toBe(
			"Advice, from Xolace, 4 min read"
		);
	});
});

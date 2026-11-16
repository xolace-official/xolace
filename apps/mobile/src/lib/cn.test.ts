import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	cn,
	FONT_NAMES,
	RADIUS_NAMES,
	SHADOW_NAMES,
	SPACING_NAMES,
	TYPE_NAMES,
	tv,
} from "./cn";
import { cn as utilsCn } from "./utils";

const src = join(import.meta.dirname, "..");
const heroTheme = join(
	dirname(createRequire(import.meta.url).resolve("heroui-native/package.json")),
	"src/styles/theme.css"
);
const css = [
	join(src, "global.css"),
	join(src, "themes/themes.generated.css"),
	join(src, "themes/type.generated.css"),
	heroTheme,
]
	.map((f) => readFileSync(f, "utf8"))
	.join("\n");

/** Names declared as `--<namespace>-<name>:` in our CSS. */
const declared = (namespace: string) => [
	...new Set(
		[...css.matchAll(new RegExp(`--${namespace}-([a-z0-9-]+):`, "g"))].map(
			(m) => m[1]
		)
	),
];
const TSHIRT_RADIUS = /^(\d?x[sl]|sm|md|lg)$/;

describe("cn", () => {
	it("is the one merge: @/lib/utils hands out the same function", () => {
		expect(utilsCn).toBe(cn);
	});

	it("lets a caller's face class beat AppText's default body face", () => {
		// Uniwind ranks by stylesheet, where font-normal sorts after these: only
		// the merge can drop it.
		for (const face of [
			"font-mirror",
			"font-letter",
			"font-display-bold",
			"font-italic",
			"font-poster",
			"font-reader",
			"font-poppins-medium",
			"font-[Poppins-Medium]",
		]) {
			expect(cn("font-normal", "text-foreground", face)).toBe(
				`text-foreground ${face}`
			);
		}
	});

	it("lets a caller's face class beat a weight or italic role on a variant", () => {
		expect(
			cn("type-body", "font-semibold", "text-foreground", "font-mirror")
		).toBe("type-body text-foreground font-mirror");
		expect(cn("type-callout", "font-italic", "font-letter")).toBe(
			"type-callout font-letter"
		);
	});

	it("font roles are families, not weights", () => {
		expect(cn("font-normal", "font-semibold")).toBe("font-semibold");
		expect(cn("font-[Poppins-Medium]", "font-bold")).toBe("font-bold");
		expect(cn("font-semibold", "font-[600]")).toBe("font-semibold font-[600]");
		expect(cn("font-display", "font-mirror")).toBe("font-mirror");
		// Weight keywords replace a role, as plain tailwind-merge did (system face).
		expect(cn("font-normal", "font-light")).toBe("font-light");
	});

	it("keeps only the last type utility, and keeps it next to a role, size or colour", () => {
		expect(cn("type-body", "type-title")).toBe("type-title");
		expect(cn("type-body", "font-semibold")).toBe("type-body font-semibold");
		expect(cn("type-body", "text-[17px]")).toBe("type-body text-[17px]");
		expect(cn("text-muted", "type-body")).toBe("text-muted type-body");
	});

	it("knows the shadow, radius, border curve and spacing tokens", () => {
		expect(cn("shadow-card", "shadow-none")).toBe("shadow-none");
		expect(cn("shadow-card", "shadow-black")).toBe("shadow-card shadow-black");
		expect(cn("rounded-card", "rounded-hero")).toBe("rounded-hero");
		expect(cn("border-continuous", "border-separator")).toBe(
			"border-continuous border-separator"
		);
		expect(cn("px-gutter", "px-4")).toBe("px-4");
		expect(cn("pt-safe", "pt-4")).toBe("pt-4");
		expect(cn("pb-4", "pb-safe-offset-4")).toBe("pb-safe-offset-4");
	});

	it("keeps HeroUI's own groups", () => {
		expect(cn("border-2", "border-field-width")).toBe("border-field-width");
		expect(cn("opacity-50", "opacity-disabled")).toBe("opacity-disabled");
	});

	it("merges every colour in the CSS as a colour", () => {
		const colours = declared("color");
		expect(colours.length).toBeGreaterThan(100);
		for (const name of colours) {
			expect(cn("text-red-500", `text-${name}`)).toBe(`text-${name}`);
			expect(cn("bg-red-500", `bg-${name}`)).toBe(`bg-${name}`);
			expect(cn(`text-${name}`, "type-body")).toBe(`text-${name} type-body`);
		}
	});

	it("knows every font, type, radius, spacing and shadow token in the CSS", () => {
		expect(new Set(FONT_NAMES)).toEqual(new Set(declared("font")));
		expect(TYPE_NAMES.map((n) => `type-${n}`).sort()).toEqual(
			[...css.matchAll(/@utility (type-[a-z0-9-]+)/g)].map((m) => m[1]).sort()
		);
		const radii = [
			...[...css.matchAll(/@utility rounded-([a-z]+)/g)].map((m) => m[1]),
			...declared("radius").filter((n) => !TSHIRT_RADIUS.test(n)),
		];
		expect(new Set(RADIUS_NAMES)).toEqual(new Set(radii));
		expect(new Set(SPACING_NAMES)).toEqual(new Set(declared("spacing")));
		expect(SHADOW_NAMES).toEqual(expect.arrayContaining(declared("shadow")));
	});
});

describe("tv", () => {
	it("merges our names in variants", () => {
		const text = tv({
			base: "type-body text-foreground",
			variants: { big: { true: "type-title" } },
		});
		expect(text({ big: true })).toBe("text-foreground type-title");
	});

	it("survives a later import of heroui-native/utils", async () => {
		const heroui = await import("heroui-native/utils");
		expect(heroui.cn("type-body", "type-title")).toBe("type-body type-title");
		expect(cn("type-body", "type-title")).toBe("type-title");
		const card = tv({
			base: "rounded-card shadow-card",
			variants: { flat: { true: "shadow-none" } },
		});
		expect(card({ flat: true })).toBe("rounded-card shadow-none");
	});
});

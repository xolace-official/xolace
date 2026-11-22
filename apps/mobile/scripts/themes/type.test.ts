import { describe, expect, it } from "vitest";
import { FIXED_FACES, FONT_ROLES } from "../../src/design/font-pairs";
import { TYPE } from "../../src/design/type";
import { TYPE_CLASS } from "../../src/design/type-classes.generated";
import { declared, read } from "./test-files";
import { kebab, renderTypeClasses, renderTypeCss } from "./type";

function utility(css: string, name: string): Record<string, string> {
	const body = css.split(`@utility ${name} {`)[1]?.split("}")[0];
	if (!body) {
		throw new Error(`no @utility ${name}`);
	}
	const out: Record<string, string> = {};
	for (const m of body.matchAll(/([a-z-]+): ([^;]+);/g)) {
		out[m[1]] = m[2];
	}
	return out;
}

describe("type utilities", () => {
	const css = read("src/themes/type.generated.css");

	it("committed files are what font-pairs.ts and type.ts build (run `bun run themes`)", () => {
		expect(css).toBe(renderTypeCss());
		expect(read("src/design/type-classes.generated.ts")).toBe(
			renderTypeClasses()
		);
	});

	it("has one class per variant, named in kebab case", () => {
		expect(Object.keys(TYPE_CLASS)).toEqual(Object.keys(TYPE));
		expect(TYPE_CLASS.headlineL).toBe("type-headline-l");
		for (const [name, cls] of Object.entries(TYPE_CLASS)) {
			expect(cls).toBe(`type-${kebab(name)}`);
			expect(css).toContain(`@utility ${cls} {`);
		}
	});

	it("matches the prototype's sizes", () => {
		expect(utility(css, "type-body")).toEqual({
			"font-family": "var(--font-normal)",
			"font-size": "17px",
			"line-height": "24px",
		});
		expect(utility(css, "type-display")).toEqual({
			"font-family": "var(--font-display)",
			"font-size": "40px",
			"letter-spacing": "-1.4px",
			"line-height": "42px",
		});
		expect(utility(css, "type-prompt")["line-height"]).toBe("32.5px");
		expect(utility(css, "type-mirror")["font-family"]).toBe(
			"var(--font-italic)"
		);
		expect(utility(css, "type-detail")["font-size"]).toBe("13.5px");
		expect(utility(css, "type-overline")["letter-spacing"]).toBe("1.25px");
		expect(utility(css, "type-poster")["font-family"]).toBe(
			"var(--font-poster)"
		);
	});

	it("every utility's face is a declared role or fixed face", () => {
		const vars = declared(css);
		for (const [name, style] of Object.entries(TYPE)) {
			expect(vars.has(`--font-${style.font}`), name).toBe(true);
		}
		for (const role of FONT_ROLES) {
			expect(vars.has(`--font-${role}`), role).toBe(true);
		}
		for (const face of Object.keys(FIXED_FACES)) {
			expect(vars.has(`--font-${face}`), face).toBe(true);
		}
	});

	it("is imported by global.css after the themes", () => {
		const global = read("src/global.css");
		const themes = global.indexOf('@import "./themes/themes.generated.css"');
		const type = global.indexOf('@import "./themes/type.generated.css"');
		expect(themes).toBeGreaterThan(-1);
		expect(type).toBeGreaterThan(themes);
	});

	it("never clashes with a font class production already declares", () => {
		const global = read("src/global.css");
		for (const name of [...FONT_ROLES, ...Object.keys(FIXED_FACES)]) {
			expect(declared(global).has(`--font-${name}`), name).toBe(false);
		}
	});
});

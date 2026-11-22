import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { devRegistry, type StatesFile } from "@/dev/registry";
import { SRC } from "@/features/import-graph";

const FEATURES = path.join(SRC, "features");
const STATES_FILE = /(^|\/)dev\/states\.tsx$/;
const Screen = () => null;

function devStatesArray(source: ts.SourceFile) {
	for (const statement of source.statements) {
		if (
			!(
				ts.isVariableStatement(statement) &&
				ts
					.getModifiers(statement)
					?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
			)
		) {
			continue;
		}
		for (const declaration of statement.declarationList.declarations) {
			let init = declaration.initializer;
			while (
				init &&
				(ts.isSatisfiesExpression(init) || ts.isAsExpression(init))
			) {
				init = init.expression;
			}
			if (
				ts.isIdentifier(declaration.name) &&
				declaration.name.text === "devStates" &&
				init &&
				ts.isArrayLiteralExpression(init)
			) {
				return init;
			}
		}
	}
}

function stateIds(array: ts.ArrayLiteralExpression): (string | null)[] {
	return array.elements.map((element) => {
		if (!ts.isObjectLiteralExpression(element)) {
			return null;
		}
		const id = element.properties.find(
			(p): p is ts.PropertyAssignment =>
				ts.isPropertyAssignment(p) &&
				ts.isIdentifier(p.name) &&
				p.name.text === "id"
		);
		return id && ts.isStringLiteral(id.initializer)
			? id.initializer.text
			: null;
	});
}

const paths = fs
	.readdirSync(FEATURES, { encoding: "utf8", recursive: true })
	.filter((rel) => STATES_FILE.test(rel))
	.sort();

const parsed = paths.map((rel) => {
	const file = path.join(FEATURES, rel);
	const source = ts.createSourceFile(
		file,
		fs.readFileSync(file, "utf8"),
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX
	);
	const array = devStatesArray(source);
	const ids = array ? stateIds(array) : [];
	const exports = array
		? {
				devStates: ids
					.filter((id) => id !== null)
					.map((id) => ({ id, Screen, title: id })),
			}
		: {};
	return { file: { exports, path: `./${rel}` } satisfies StatesFile, ids };
});

describe("dev/states.tsx files", () => {
	it("finds the files it checks", () => {
		expect(paths).toContain("reach-me-on/dev/states.tsx");
	});

	it("each export devStates as an array of states with literal ids", () => {
		const unreadable = parsed
			.filter(({ ids }) => ids.length === 0 || ids.includes(null))
			.map(({ file }) => file.path);
		expect(
			unreadable,
			'Export `devStates: readonly DevState[] = [{ id: "…", … }]`: an array literal with string ids, so this test can read them'
		).toEqual([]);
	});

	it("pass the registry's rules: path, kebab-case ids, one id per feature", () => {
		expect(devRegistry(parsed.map(({ file }) => file)).problems).toEqual([]);
	});
});

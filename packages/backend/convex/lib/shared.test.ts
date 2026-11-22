import ts from "typescript";
import { describe, expect, it } from "vitest";
import { MAX_DICTATION_BYTES } from "../dictation/plus";
import { VOICE_CATALOG } from "./elevenLabsVoices";
import {
	DICTATION_BIT_RATE,
	DICTATION_MAX_TAKE_MS,
	ERROR_CODES,
	hasSpokenContent,
	isStreakMilestone,
	isVoiceSlug,
	letterOpeningLine,
	RETENTION_KEEPS_LONGER,
	retentionShortens,
	VOICE_SLUGS,
} from "./shared";
import sharedSource from "./shared.ts?raw";
import {
	dataRetentionPreferenceValidator,
	sessionErrorCodeValidator,
} from "./validators";
import { voiceSlugValidator } from "./voices";

const source = ts.createSourceFile(
	"shared.ts",
	sharedSource,
	ts.ScriptTarget.Latest,
	true
);
const MS_PER_SECOND = 1000;
const BITS_PER_BYTE = 8;
const STREAK_DAYS_CHECKED = 400;

const isTypeOnlyImport = (clause: ts.ImportClause | undefined) => {
	if (!clause) {
		return false;
	}
	const named = clause.namedBindings;
	return (
		clause.isTypeOnly ||
		(!clause.name &&
			named !== undefined &&
			ts.isNamedImports(named) &&
			named.elements.every((e) => e.isTypeOnly))
	);
};

const isDynamicLoad = (node: ts.Node) =>
	ts.isCallExpression(node) &&
	(node.expression.kind === ts.SyntaxKind.ImportKeyword ||
		(ts.isIdentifier(node.expression) && node.expression.text === "require"));

function runtimeImports(file: ts.SourceFile): string[] {
	const found: string[] = [];
	const visit = (node: ts.Node) => {
		const staticImport =
			ts.isImportDeclaration(node) && !isTypeOnlyImport(node.importClause);
		const reExport =
			ts.isExportDeclaration(node) &&
			node.moduleSpecifier !== undefined &&
			!node.isTypeOnly;
		if (staticImport || reExport || isDynamicLoad(node)) {
			found.push(node.getText(file));
		}
		ts.forEachChild(node, visit);
	};
	visit(file);
	return found;
}

const sortedLiterals = (validator: { members: { value: unknown }[] }) =>
	validator.members.map((m) => String(m.value)).sort();

describe("lib/shared, the values every client bundles", () => {
	it("imports nothing at run time", () => {
		expect(runtimeImports(source)).toEqual([]);
	});

	it("reads no environment", () => {
		expect(sharedSource).not.toMatch(/process\.env|import\.meta/);
	});

	it("changes only on purpose: shipped binaries keep the old values", async () => {
		const shared = await import("./shared");
		const values = Object.fromEntries(
			Object.entries(shared).filter(([, v]) => typeof v !== "function")
		);
		expect(values).toMatchInlineSnapshot(`
			{
			  "BADGE_PIN_LIMIT": 3,
			  "BRIDGE_ADDRESS_TERM_MAX_CHARS": 40,
			  "BRIDGE_NAME_MAX_CHARS": 60,
			  "COMPANION_FALLBACK_NAME": "Ember",
			  "CRISIS_RESOURCES_KIND": "crisis_resources",
			  "DICTATION_BIT_RATE": 32000,
			  "DICTATION_MAX_TAKE_MS": 180000,
			  "DISPLAY_NAME_MAX_CODE_POINTS": 30,
			  "ERROR_CODES": {
			    "rateLimited": "rate_limited",
			    "reflectionRateLimited": "reflection_rate_limited",
			    "safeguardRejected": "content_policy_violation",
			    "swapLimitReached": "swap_limit_reached",
			    "swapNotAllowed": "swap_not_allowed",
			  },
			  "EVENT_PROMPT_CARRY_MS": 604800000,
			  "EXERCISE_MAX_SWAPS": 2,
			  "FEEDBACK_MAX_CHARS": 1000,
			  "INTAKE_MAX_SELECTIONS": 3,
			  "LETTER_MAX_CHARS": 500,
			  "LETTER_MIN_CHARS": 40,
			  "LIBRARY_HELPED_FLOOR": 15,
			  "PRESENCE_HEARTBEAT_MS": 30000,
			  "PRESENCE_ROOM": "app",
			  "QUOTE_REPLY_MAX_CHARS": 500,
			  "REFINEMENT_MAX_TURNS": 2,
			  "REFLECTION_INPUT_MAX_CHARS": 5000,
			  "REFLECTION_MAX_TEXTURES": 4,
			  "RETENTION_KEEPS_LONGER": [
			    "6_months",
			    "1_year",
			    "indefinite",
			  ],
			  "STREAK_MILESTONES": [
			    7,
			    30,
			    100,
			  ],
			  "STREAK_MILESTONE_EVERY": 100,
			  "TALK_DEMO_LINE_MAX_CHARS": 1000,
			  "TALK_FALLBACK_VOICE": "vesper",
			  "TELEGRAM_LINK_TTL_MS": 900000,
			  "VOICE_SLUGS": [
			    "sage",
			    "wren",
			    "vesper",
			    "ash",
			  ],
			  "WEEKS_BACK_MAX": 52,
			  "XOLACER_BIO_MAX_CHARS": 160,
			  "XOLACER_NAME_MAX_CHARS": 40,
			}
		`);
	});

	it("keeps a full dictation take under the server's byte cap", () => {
		const takeBytes =
			(DICTATION_MAX_TAKE_MS / MS_PER_SECOND) *
			(DICTATION_BIT_RATE / BITS_PER_BYTE);
		expect(takeBytes).toBeLessThanOrEqual(MAX_DICTATION_BYTES);
	});

	it("names the same voices as the validator and the ElevenLabs cast", () => {
		expect(sortedLiterals(voiceSlugValidator)).toEqual([...VOICE_SLUGS].sort());
		expect(Object.keys(VOICE_CATALOG).sort()).toEqual([...VOICE_SLUGS].sort());
		expect(isVoiceSlug("vesper")).toBe(true);
		expect(isVoiceSlug("toString")).toBe(false);
		expect(isVoiceSlug(undefined)).toBe(false);
	});

	it("orders every stored retention tier", () => {
		expect(sortedLiterals(dataRetentionPreferenceValidator)).toEqual(
			[...RETENTION_KEEPS_LONGER].sort()
		);
		expect(retentionShortens("indefinite", "6_months")).toBe(true);
		expect(retentionShortens("6_months", "1_year")).toBe(false);
	});

	it("stores only the session error codes it exports", () => {
		expect(sortedLiterals(sessionErrorCodeValidator)).toEqual(
			[ERROR_CODES.reflectionRateLimited, ERROR_CODES.safeguardRejected].sort()
		);
	});

	it("lands a streak milestone on 7, 30, 100, then every 100", () => {
		const days = Array.from({ length: STREAK_DAYS_CHECKED }, (_, i) => i + 1);
		expect(days.filter(isStreakMilestone)).toEqual([7, 30, 100, 200, 300, 400]);
	});

	it("cuts a letter's opening line at a word", () => {
		expect(letterOpeningLine("Short first line\nsecond")).toBe(
			"Short first line"
		);
		expect(
			letterOpeningLine(
				"You don't have to have it figured out to deserve a rest tonight."
			)
		).toBe("You don't have to have it figured out to…");
	});

	it("hears letters or digits in any script, not noise", () => {
		expect(hasSpokenContent("...")).toBe(false);
		expect(hasSpokenContent("  ")).toBe(false);
		expect(hasSpokenContent("ok")).toBe(true);
		expect(hasSpokenContent("はい")).toBe(true);
		expect(hasSpokenContent("3")).toBe(true);
	});
});

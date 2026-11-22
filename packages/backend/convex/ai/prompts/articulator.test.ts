import { describe, expect, it } from "vitest";
import { entryForAi } from "./accumulatedInput";
import { buildArticulatorPrompt } from "./articulator";

/**
 * word_cloud became reach-eligible on 2026-09-04 (routing.ts, §3.5), so the
 * texture-words block now co-occurs with reaching/holding. Its "complete
 * emotional picture" sentence contradicts both and must drop out; the other
 * two sentences are guards the faint path still needs.
 */
const COMPLETE_PICTURE = "complete emotional picture";
const THEIR_LANGUAGE = "These ARE their language";
const NO_ADDING = "Do not add emotions not implied by the words";

const build = (claimStrength?: "reaching" | "holding" | "measured") =>
	buildArticulatorPrompt({
		claimStrength,
		classification: {
			intensity: 5,
			primaryEmotion: "numbness",
			primaryEmotionConfidence: 0.6,
			requiresFollowUp: false,
			specificity: 2,
			supportNeed: "none",
			thematicTags: [],
			userLanguageTags: ["heavy", "tight", "blank"],
		},
		entryType: "word_cloud",
		isFirstSession: false,
		mirrorTone: "adaptive",
		patternSummary: "(none)",
		rawInput: "heavy, tight, blank",
		recentMirrors: [],
		safeguardLevel: "none",
	}).system;

describe("articulator — word_cloud entry-type block", () => {
	it("asks for a complete picture on the normal path", () => {
		const system = build("measured");
		expect(system).toContain(COMPLETE_PICTURE);
		expect(system).toContain(THEIR_LANGUAGE);
		expect(system).toContain(NO_ADDING);
	});

	it("drops only the complete-picture sentence when faint", () => {
		for (const claimStrength of ["reaching", "holding"] as const) {
			const system = build(claimStrength);
			expect(system).not.toContain(COMPLETE_PICTURE);
			expect(system).toContain(THEIR_LANGUAGE);
			expect(system).toContain(NO_ADDING);
		}
	});
});

// ADR-0014: intake-signal instructions handed to the model, never a coded
// corroboration gate.
const buildWithIntake = (
	intakeSignals: Parameters<typeof buildArticulatorPrompt>[0]["intakeSignals"]
) =>
	buildArticulatorPrompt({
		classification: {
			intensity: 4,
			primaryEmotion: "fatigue",
			primaryEmotionConfidence: 0.6,
			requiresFollowUp: false,
			specificity: 3,
			supportNeed: "none",
			thematicTags: [],
			userLanguageTags: ["tired"],
		},
		entryType: "open_prompt",
		intakeSignals,
		isFirstSession: true,
		mirrorTone: "adaptive",
		patternSummary: "(none)",
		rawInput: "just tired today",
		recentMirrors: [],
		safeguardLevel: "none",
	}).system;

describe("articulator — intake signal instructions (ADR-0014)", () => {
	it("emits no intake block when intakeSignals is null", () => {
		const system = buildWithIntake(null);
		expect(system).not.toContain("Intake Signal");
	});

	it("references disclosureStyle when only that axis is present", () => {
		const system = buildWithIntake({ disclosureStyle: "keep_it_brief" });
		expect(system).toContain("Intake Signal");
		expect(system).toContain("keep things brief");
		expect(system).not.toContain("struggle to find the words");
	});

	it("references emotionAwareness when only that axis is present", () => {
		const system = buildWithIntake({
			disclosureStyle: "depends",
			emotionAwareness: "numb_or_cant_tell",
		});
		expect(system).toContain("often feel numb");
	});

	it("includes both axes and the corroboration instruction when both fire", () => {
		const system = buildWithIntake({
			disclosureStyle: "keep_it_brief",
			emotionAwareness: "know_but_no_words",
		});
		expect(system).toContain("keep things brief");
		expect(system).toContain("struggle to find the words");
		expect(system).toContain("Only let the intake claim shape your mirror");
		expect(system).toContain("Never mention intake");
	});
});

/** B10: the mirror reads the feeling words people pick, apart from their writing. */
const buildWith = ({
	entryType,
	rawInput,
	textures,
	writtenChars,
}: {
	entryType: string;
	rawInput: string;
	textures?: string[];
	writtenChars?: number;
}) =>
	buildArticulatorPrompt({
		classification: {
			intensity: 5,
			primaryEmotion: "sadness",
			primaryEmotionConfidence: 0.6,
			requiresFollowUp: false,
			specificity: 3,
			supportNeed: "none",
			thematicTags: [],
			userLanguageTags: [],
		},
		entryType,
		intakeSignals: { disclosureStyle: "keep_it_brief" },
		isFirstSession: true,
		mirrorTone: "adaptive",
		patternSummary: "(none)",
		rawInput: entryForAi({ entryType, rawInput, textures }),
		recentMirrors: [],
		safeguardLevel: "none",
		textures,
		writtenChars,
	});

describe("articulator — picked feeling words (B10)", () => {
	it("typed only: no feeling-words block, their text as the input", () => {
		const { system, user } = buildWith({
			entryType: "open_prompt",
			rawInput: "work again, all week",
		});
		expect(system).not.toContain("## Feeling Words");
		expect(user).toBe("work again, all week");
		expect(system).toContain("20 characters written");
	});

	it("words only: says they only picked, and never to present them as said", () => {
		const { system, user } = buildWith({
			entryType: "word_cloud",
			rawInput: "heavy, restless",
			textures: ["heavy", "restless"],
			writtenChars: 0,
		});
		expect(system).toContain("## Feeling Words");
		expect(system).toContain("wrote nothing: heavy, restless");
		expect(system).toContain(
			"never present them as something they wrote or said"
		);
		expect(user).toContain("they only picked feeling words");
		expect(system).toContain("0 characters written");
	});

	it("both: two labelled inputs, read as one moment, quote only their words", () => {
		const { system, user } = buildWith({
			entryType: "guided_entry",
			rawInput: "work again, all week",
			textures: ["heavy", "restless"],
			writtenChars: 20,
		});
		expect(user).toBe(
			"What they wrote:\nwork again, all week\n\nFeeling words they picked: heavy, restless"
		);
		expect(system).toContain("picked these feeling words: heavy, restless");
		expect(system).toContain("describe the same moment");
		expect(system).toContain("never a picked word as something they said");
		// The count is what they wrote, not the labelled input.
		expect(system).toContain("20 characters written");
	});
});

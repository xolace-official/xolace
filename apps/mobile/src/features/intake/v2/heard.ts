/** What the first answer told us, in `intake.v2.complete`'s own terms (#704). */
import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionArgs, FunctionReturnType } from "convex/server";
import { MAX_SELECTIONS } from "@/features/intake/questions";

type CompleteArgs = FunctionArgs<typeof api.intake.v2.complete>;

/** Flux's reading of the answer (#708): the safety route, or what it heard. */
export type Reading = FunctionReturnType<typeof api.ai.intake.read.firstAnswer>;
type HeardReading = Extract<Reading, { route: "heard" }>;
/** The one follow-up a reading may ask, and the field it is for. */
export type FollowUp = NonNullable<HeardReading["followUp"]>;
export type SafetyResource = Extract<
	Reading,
	{ route: "safety" }
>["resources"][number];

/** The four fields a first answer can fill. `weighingOn` is always held as a list. */
export type Heard = Omit<
	Pick<
		CompleteArgs,
		"intent" | "weighingOn" | "disclosureStyle" | "emotionAwareness"
	>,
	"weighingOn"
> & { weighingOn: NonNullable<CompleteArgs["weighingOn"]> };

export const NOTHING_HEARD: Heard = { weighingOn: [] };

type Single = "intent" | "disclosureStyle" | "emotionAwareness";

/** One chip: the field it fills and the enum value it records. */
export type Chip =
	| { [F in Single]: { field: F; value: NonNullable<Heard[F]> } }[Single]
	| { field: "weighingOn"; value: Heard["weighingOn"][number] };

export type ChipGroup = {
	chips: readonly (Chip & { label: string })[];
	label: string;
};

/**
 * The chips "Here's what I heard" can show, grouped as the design groups them (README § A).
 * Short labels for a chip, not v1's question copy. No "I'd rather not say": a chip left off
 * already means not told.
 */
export const CHIP_GROUPS: readonly ChipGroup[] = [
	{
		chips: [
			{
				field: "intent",
				label: "Get through a hard moment",
				value: "get_through_hard_moment",
			},
			{
				field: "intent",
				label: "Understand what I'm feeling",
				value: "understand_feelings",
			},
			{ field: "intent", label: "Feel less alone", value: "feel_less_alone" },
			{
				field: "intent",
				label: "Make it a regular thing",
				value: "make_it_regular",
			},
			{ field: "intent", label: "Just looking around", value: "just_looking" },
		],
		label: "Why you came",
	},
	{
		chips: [
			{ field: "weighingOn", label: "Work", value: "work" },
			{ field: "weighingOn", label: "Relationships", value: "relationships" },
			{ field: "weighingOn", label: "Family", value: "family" },
			{ field: "weighingOn", label: "Health", value: "health" },
			{ field: "weighingOn", label: "Money", value: "money" },
			{ field: "weighingOn", label: "Identity", value: "identity" },
			{ field: "weighingOn", label: "Purpose", value: "purpose" },
			{ field: "weighingOn", label: "A loss", value: "a_loss" },
			{ field: "weighingOn", label: "A big change", value: "big_change" },
			{ field: "weighingOn", label: "Can't name it", value: "cant_name_yet" },
		],
		label: "Weighing on you",
	},
	{
		chips: [
			{
				field: "disclosureStyle",
				label: "Let it all out at once",
				value: "all_at_once",
			},
			{
				field: "disclosureStyle",
				label: "Share a bit at a time",
				value: "bit_at_a_time",
			},
			{
				field: "disclosureStyle",
				label: "Keep it brief",
				value: "keep_it_brief",
			},
			{
				field: "disclosureStyle",
				label: "Depends on the day",
				value: "depends",
			},
			{
				field: "emotionAwareness",
				label: "Can say what I feel",
				value: "know_and_can_say",
			},
			{
				field: "emotionAwareness",
				label: "Know it, not the words",
				value: "know_but_no_words",
			},
			{
				field: "emotionAwareness",
				label: "Can tell something's off, not what",
				value: "something_off_unclear",
			},
			{
				field: "emotionAwareness",
				label: "Mostly numb",
				value: "numb_or_cant_tell",
			},
		],
		label: "How you put it",
	},
];

export function isOn(heard: Heard, chip: Chip): boolean {
	return chip.field === "weighingOn"
		? heard.weighingOn.includes(chip.value)
		: heard[chip.field] === chip.value;
}

/** Taps one chip on or off. Weighing-on holds {@link MAX_SELECTIONS}, dropping the oldest. */
export function toggleChip(heard: Heard, chip: Chip): Heard {
	if (chip.field === "weighingOn") {
		const weighingOn = isOn(heard, chip)
			? heard.weighingOn.filter((v) => v !== chip.value)
			: [...heard.weighingOn, chip.value].slice(-MAX_SELECTIONS);
		return { ...heard, weighingOn };
	}
	return {
		...heard,
		[chip.field]: heard[chip.field] === chip.value ? undefined : chip.value,
	};
}

const chipsOf = (heard: Heard): string[] => [
	...(["intent", "disclosureStyle", "emotionAwareness"] as const).flatMap(
		(field) => (heard[field] ? [`${field}:${heard[field]}`] : [])
	),
	...heard.weighingOn.map((value) => `weighingOn:${value}`),
];

/** A reading's fields as chips, on (or, for `suggested`, marked). The confidences stay with the reader. */
export function heardOf({
	disclosureStyle,
	emotionAwareness,
	intent,
	weighingOn,
}: HeardReading["fields"]): Heard {
	return {
		weighingOn: weighingOn?.value ?? [],
		...(intent ? { intent: intent.value } : {}),
		...(disclosureStyle ? { disclosureStyle: disclosureStyle.value } : {}),
		...(emotionAwareness ? { emotionAwareness: emotionAwareness.value } : {}),
	};
}

export const heardNothing = (heard: Heard) => chipsOf(heard).length === 0;

/** How many chips a reading suggested. */
export const suggestionCount = (suggested: Heard) => chipsOf(suggested).length;

/** Suggested chips the user tapped on. A count, never values. */
export function suggestionsTaken(suggested: Heard, final: Heard): number {
	const after = new Set(chipsOf(final));
	return chipsOf(suggested).filter((chip) => after.has(chip)).length;
}

/** Chips tapped off and on, against what the answer was read as. Counts only, never values. */
export function chipChanges(read: Heard, final: Heard) {
	const before = new Set(chipsOf(read));
	const after = new Set(chipsOf(final));
	const kept = [...after].filter((chip) => before.has(chip)).length;
	return { added: after.size - kept, kept, removed: before.size - kept };
}

/** `intake.v2.complete`'s args: the name, plus only the fields that were heard. */
export function completeArgs(displayName: string, heard: Heard): CompleteArgs {
	const { disclosureStyle, emotionAwareness, intent, weighingOn } = heard;
	return {
		displayName,
		...(intent ? { intent } : {}),
		...(weighingOn.length > 0 ? { weighingOn } : {}),
		...(disclosureStyle ? { disclosureStyle } : {}),
		...(emotionAwareness ? { emotionAwareness } : {}),
	};
}

const ECHO_WORDS = 7;

/** The answer as Flux quotes it back: whole if short, else its first words and an ellipsis. */
export function echoOf(answer: string): string {
	const words = answer.trim().split(/\s+/);
	return words.length > ECHO_WORDS
		? `${words.slice(0, ECHO_WORDS).join(" ")}…`
		: answer.trim();
}

import type { api } from "@xolace/backend/convex/_generated/api";
import { INTAKE_MAX_SELECTIONS } from "@xolace/backend/shared";
import type { FunctionArgs, FunctionReturnType } from "convex/server";

type CompleteArgs = FunctionArgs<typeof api.intake.v2.complete>;

export type Reading = FunctionReturnType<typeof api.ai.intake.read.firstAnswer>;
type HeardReading = Extract<Reading, { route: "heard" }>;
export type FollowUp = NonNullable<HeardReading["followUp"]>;
export type SafetyResource = Extract<
	Reading,
	{ route: "safety" }
>["resources"][number];

export type Heard = Omit<
	Pick<
		CompleteArgs,
		"intent" | "weighingOn" | "disclosureStyle" | "emotionAwareness"
	>,
	"weighingOn"
> & { weighingOn: NonNullable<CompleteArgs["weighingOn"]> };

export const NOTHING_HEARD: Heard = { weighingOn: [] };

type Single = "intent" | "disclosureStyle" | "emotionAwareness";

export type Chip =
	| { [F in Single]: { field: F; value: NonNullable<Heard[F]> } }[Single]
	| { field: "weighingOn"; value: Heard["weighingOn"][number] };

export type ChipGroup = {
	chips: readonly (Chip & { label: string })[];
	label: string;
};

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

export function toggleChip(heard: Heard, chip: Chip): Heard {
	if (chip.field === "weighingOn") {
		const weighingOn = isOn(heard, chip)
			? heard.weighingOn.filter((v) => v !== chip.value)
			: [...heard.weighingOn, chip.value].slice(-INTAKE_MAX_SELECTIONS);
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

export const suggestionCount = (suggested: Heard) => chipsOf(suggested).length;

export function suggestionsTaken(suggested: Heard, final: Heard): number {
	const after = new Set(chipsOf(final));
	return chipsOf(suggested).filter((chip) => after.has(chip)).length;
}

export function chipChanges(read: Heard, final: Heard) {
	const before = new Set(chipsOf(read));
	const after = new Set(chipsOf(final));
	const kept = [...after].filter((chip) => before.has(chip)).length;
	return { added: after.size - kept, kept, removed: before.size - kept };
}

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

export function echoOf(answer: string): string {
	const words = answer.trim().split(/\s+/);
	return words.length > ECHO_WORDS
		? `${words.slice(0, ECHO_WORDS).join(" ")}…`
		: answer.trim();
}

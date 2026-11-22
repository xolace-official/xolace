import type { Id } from "@xolace/backend/dataModel";
import type { CatalogueExercise } from "../sit-model";

// The four moderate-only exercises, as the seed sets them (B16).

const id = (title: string) => `fixture-${title}` as Id<"exercises">;

export const PAUSE_BEFORE_ACTING: CatalogueExercise = {
	_id: id("pause_before_acting"),
	steps: [
		{
			content: "Before you do anything, pause.",
			durationSeconds: 4,
			order: 1,
			type: "text",
		},
		{
			content: "You don’t have to act on it yet.",
			durationSeconds: 4,
			order: 2,
			type: "text",
		},
		{
			breathCycles: 1,
			breathPattern: "physiological_sigh",
			content: "Step back from it.",
			order: 3,
			type: "breath",
		},
		{
			content: "{{mirror_line}}",
			defaultContent: "Something just happened that matters to you.",
			durationSeconds: 4,
			order: 4,
			slotKeys: ["mirror_line"],
			type: "text",
		},
		{
			content:
				"Notice it: something in you is {{user_emotion}}, and wants to do something.",
			defaultContent: "Notice it: something in you wants to do something.",
			durationSeconds: 6,
			order: 5,
			slotKeys: ["user_emotion"],
			type: "text",
		},
		{
			breathCycles: 2,
			breathPattern: "extended_exhale",
			content: "Feel the pull.\nDon’t follow it yet.",
			order: 6,
			type: "breath",
		},
		{
			content: "An hour from now, what would you be glad you did?",
			order: 7,
			promptMaxSeconds: 60,
			promptPlaceholder: "Whatever comes first.",
			type: "private_prompt",
		},
		{
			content: "You can decide from here.",
			durationSeconds: 4,
			order: 8,
			type: "text",
		},
	],
	title: "pause_before_acting",
};

export const SLOW_IT_DOWN: CatalogueExercise = {
	_id: id("slow_it_down"),
	steps: [
		{
			content: "Nothing to do here but breathe a little slower.",
			durationSeconds: 5,
			order: 1,
			type: "text",
		},
		{
			breathCycles: 2,
			breathPattern: "slow_exhale",
			content: "Follow it in.\nFollow it out.",
			order: 2,
			type: "breath",
		},
		{
			content: "A little longer now.",
			durationSeconds: 3,
			order: 3,
			type: "text",
		},
		{
			breathCycles: 3,
			breathPattern: "extended_exhale",
			content: "In through your nose.\nOut, slower than it came in.",
			order: 4,
			type: "breath",
		},
		{
			breathCycles: 2,
			breathPattern: "extended_exhale",
			content:
				"If it ever feels like too little air, breathe however you need.",
			durationSeconds: 6,
			order: 5,
			syncToBreath: true,
			type: "text",
		},
		{
			content: "Your breath can find its own pace now.",
			durationSeconds: 5,
			order: 6,
			type: "text",
		},
	],
	title: "slow_it_down",
};

export const NOT_ONLY_YOU: CatalogueExercise = {
	_id: id("not_only_you"),
	steps: [
		{
			content: "{{mirror_line}}",
			defaultContent: "What you’re carrying is heavy.",
			durationSeconds: 4,
			order: 1,
			slotKeys: ["mirror_line"],
			type: "text",
		},
		{
			content: "This is a hard moment.",
			durationSeconds: 4,
			order: 2,
			type: "text",
		},
		{
			content: "Right now, other people are feeling something like this too.",
			durationSeconds: 6,
			order: 3,
			type: "text",
		},
		{
			content: "Not the same story. Something close to it.",
			durationSeconds: 5,
			order: 4,
			type: "text",
		},
		{
			breathCycles: 2,
			breathPattern: "extended_exhale",
			content: "You’re one of many.\nFeeling this is part of being a person.",
			order: 5,
			type: "breath",
		},
		{
			content: "It doesn’t mean something is wrong with you.",
			durationSeconds: 5,
			order: 6,
			type: "text",
		},
		{
			content: "It means you’re human, and this hurts.",
			durationSeconds: 5,
			order: 7,
			type: "text",
		},
	],
	title: "not_only_you",
};

export const NAME_THE_ROOM: CatalogueExercise = {
	_id: id("name_the_room"),
	steps: [
		{
			content: "Let your eyes leave the screen for a moment.",
			durationSeconds: 5,
			order: 1,
			type: "text",
		},
		{
			content: "Find something blue.",
			durationSeconds: 8,
			order: 2,
			type: "text",
		},
		{
			content: "Find something with a straight edge.",
			durationSeconds: 8,
			order: 3,
			type: "text",
		},
		{
			content: "Find something you could pick up.",
			durationSeconds: 8,
			order: 4,
			type: "text",
		},
		{
			content: "Say its name, quietly or in your head.",
			durationSeconds: 6,
			order: 5,
			type: "text",
		},
		{
			content: "Where are you right now?",
			order: 6,
			promptMaxSeconds: 60,
			promptPlaceholder: "The room, the place, the time of day.",
			type: "private_prompt",
		},
		{
			content: "That’s where you are. This is now.",
			durationSeconds: 5,
			order: 7,
			type: "text",
		},
		{
			breathCycles: 2,
			breathPattern: "slow_exhale",
			content: "Here.",
			order: 8,
			type: "breath",
		},
	],
	title: "name_the_room",
};

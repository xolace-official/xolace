import type { Id } from "@xolace/backend/dataModel";
import type { CatalogueExercise, Slots } from "../sit-model";

const id = (title: string) => `fixture-${title}` as Id<"exercises">;

export const LET_IT_LAND: CatalogueExercise = {
	_id: id("let_it_land"),
	steps: [
		{
			content: "You named it. Let’s just sit with that for a moment.",
			durationSeconds: 4,
			order: 1,
			type: "text",
		},
		{
			content: "{{mirror_line}}",
			defaultContent: "What you named is here with you.",
			durationSeconds: 3,
			order: 2,
			slotKeys: ["mirror_line"],
			type: "text",
		},
		{
			breathCycles: 2,
			breathPattern: "physiological_sigh",
			content: "Breathe with it.",
			hapticIntensity: "light",
			order: 3,
			type: "breath",
		},
		{
			content:
				"Notice where in your body “{{user_phrase}}” lives right now. Not to fix it. Just so it knows you heard it.",
			defaultContent:
				"Notice where this lives in your body right now. Not to fix it. Just so it knows you heard it.",
			durationSeconds: 6,
			order: 4,
			slotKeys: ["user_phrase"],
			type: "text",
		},
		{
			content: "You don’t have to do anything with it.",
			durationSeconds: 6,
			order: 5,
			type: "text",
		},
	],
	title: "let_it_land",
};

export const FIND_YOUR_EDGES: CatalogueExercise = {
	_id: id("find_your_edges"),
	steps: [
		{
			content: "Before anything else, let’s find where you are.",
			durationSeconds: 5,
			order: 1,
			type: "text",
		},
		{
			content: "Look around. Don’t move your head much, just your eyes.",
			durationSeconds: 4,
			order: 2,
			type: "text",
		},
		{
			content: "Find three things. A corner. A shadow. A color. Anything.",
			durationSeconds: 10,
			order: 3,
			type: "text",
		},
		{
			content: "Now feel your feet. Whatever they’re touching.",
			durationSeconds: 5,
			order: 4,
			type: "text",
		},
		{
			content: "Your back. Against what’s behind it.",
			durationSeconds: 5,
			order: 5,
			type: "text",
		},
		{
			content: "Your hands. What temperature are they?",
			durationSeconds: 6,
			order: 6,
			type: "text",
		},
		{
			breathCycles: 1,
			breathPattern: "slow_exhale",
			content: "One slow exhale.",
			order: 7,
			type: "breath",
		},
		{
			content: "You’re here. That’s enough.",
			durationSeconds: 5,
			order: 8,
			type: "text",
		},
	],
	title: "find_your_edges",
};

export const MAKE_ROOM: CatalogueExercise = {
	_id: id("make_room"),
	steps: [
		{
			content: "{{mirror_line}}",
			defaultContent: "You’re carrying something heavy.",
			durationSeconds: 4,
			order: 1,
			slotKeys: ["mirror_line"],
			type: "text",
		},
		{
			content: "What if you didn’t have to make this smaller right now?",
			durationSeconds: 4,
			order: 2,
			type: "text",
		},
		{
			breathCycles: 3,
			breathPattern: "extended_exhale",
			content:
				"Breathing in, imagine giving it room.\nBreathing out, rest beside it.",
			order: 3,
			type: "breath",
		},
		{
			breathCycles: 1,
			breathPattern: "slow_exhale",
			content: "It doesn’t have to leave to stop hurting.",
			durationSeconds: 6,
			order: 4,
			syncToBreath: true,
			type: "text",
		},
	],
	title: "make_room",
};

export const SPEAK_TO_IT: CatalogueExercise = {
	_id: id("speak_to_it"),
	steps: [
		{
			content: "Something in you is {{user_emotion}}.",
			defaultContent: "Something in you is stirred up.",
			durationSeconds: 5,
			order: 1,
			slotKeys: ["user_emotion"],
			type: "text",
		},
		{
			content: "Not all of you. Something.",
			durationSeconds: 4,
			order: 2,
			type: "text",
		},
		{
			content: "Imagine it could speak. Let it, for a moment.",
			durationSeconds: 6,
			order: 3,
			type: "text",
		},
		{
			content: "What does it want you to know?",
			order: 4,
			promptMaxSeconds: 60,
			promptPlaceholder: "Say it however it comes.",
			type: "private_prompt",
		},
		{
			content: "You heard it. That matters.",
			durationSeconds: 4,
			order: 5,
			type: "text",
		},
	],
	title: "speak_to_it",
};

export const SOFTEN_TOWARD_IT: CatalogueExercise = {
	_id: id("soften_toward_it"),
	steps: [
		{
			content: "You said: “{{user_phrase}}.”",
			defaultContent: "You named something hard.",
			durationSeconds: 4,
			order: 1,
			slotKeys: ["user_phrase"],
			type: "text",
		},
		{
			content:
				"Right now, in this moment, you’re not the only one feeling something like this.",
			durationSeconds: 5,
			order: 2,
			type: "text",
		},
		{
			content:
				"Place a hand somewhere on yourself. Chest, arm, face, wherever feels natural.",
			durationSeconds: 5,
			order: 3,
			type: "text",
		},
		{
			content: "Feel your hand resting there.",
			defaultContent: "Feel your hand resting there.",
			durationSeconds: 6,
			hapticIntensity: "medium",
			order: 4,
			type: "haptic",
		},
		{
			content:
				"If you could offer yourself one kind sentence, what would it be?",
			durationSeconds: 6,
			order: 5,
			type: "text",
		},
		{
			breathCycles: 1,
			breathPattern: "slow_exhale",
			content: "You don’t have to say it out loud. Just let yourself hear it.",
			durationSeconds: 6,
			order: 6,
			syncToBreath: true,
			type: "text",
		},
		{
			content: "That was kind.",
			durationSeconds: 5,
			order: 7,
			type: "text",
		},
	],
	title: "soften_toward_it",
};

export const RESET: CatalogueExercise = {
	_id: id("reset"),
	steps: [
		{
			content: "Three breaths. That’s it.",
			durationSeconds: 3,
			order: 1,
			type: "text",
		},
		{
			breathCycles: 3,
			breathPattern: "physiological_sigh",
			content: "",
			hapticIntensity: "light",
			order: 2,
			type: "breath",
		},
		{ content: "That was enough.", durationSeconds: 4, order: 3, type: "text" },
	],
	title: "reset",
};

export const REFLECT_SLOTS: Slots = {
	mirror_line: "It sounds like the meeting is still playing on a loop.",
	user_emotion: "tired",
	user_phrase: "one step behind",
};

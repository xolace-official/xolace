import { describe, expect, it } from "vitest";
import {
	type SavedMood,
	type SessionExit,
	sessionCompletedEvent,
} from "./session-end-model";

const STRUCTURAL_KEYS = [
	"action",
	"contributed_reflection",
	"kindling_ready",
	"mood_position",
	"post_session_mood",
];

describe("sessionCompletedEvent", () => {
	it("carries only structural fields, so a user's themes can't be rebuilt from analytics", () => {
		const exit = {
			action: "open_kindling",
			kindling_ready: true,
			themes: ["grief"],
		} as SessionExit;
		const mood = {
			moodPosition: 2,
			note: "my brother",
			postSessionMood: "lighter",
		} as SavedMood;
		const event = sessionCompletedEvent(exit, mood, true);
		for (const key of Object.keys(event)) {
			expect(STRUCTURAL_KEYS).toContain(key);
		}
		expect(event).toEqual({
			action: "open_kindling",
			contributed_reflection: true,
			kindling_ready: true,
			mood_position: 2,
			post_session_mood: "lighter",
		});
	});

	it("records an exit without a saved mood as nulls", () => {
		expect(sessionCompletedEvent({ action: "dismiss" }, null, null)).toEqual({
			action: "dismiss",
			contributed_reflection: null,
			mood_position: null,
			post_session_mood: null,
		});
	});
});

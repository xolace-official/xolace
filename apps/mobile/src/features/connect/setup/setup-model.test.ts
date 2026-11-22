import { XOLACER_BIO_MAX_CHARS } from "@xolace/backend/shared";
import { describe, expect, it } from "vitest";
import { EMPTY_DRAFT, FULL_DRAFT } from "./dev/setup-fixtures";
import {
	bioCount,
	blockingStep,
	chipLabel,
	isStepComplete,
	LAST_STEP,
	MAX_SPECIALTIES,
	progressLine,
	resumeStep,
	toggleSpecialty,
} from "./setup-model";

describe("setup progress", () => {
	it("counts Review as done, so an empty draft reads 1 of 5", () => {
		expect(progressLine(EMPTY_DRAFT)).toEqual({
			ready: false,
			text: "1 of 5 complete. Add a photo to publish.",
		});
	});

	it("names the first missing step, not the last", () => {
		const draft = { ...FULL_DRAFT, displayName: " ", specialties: [] };
		expect(progressLine(draft).text).toBe(
			"3 of 5 complete. Add a name to publish."
		);
	});

	it("is ready once all four steps are complete", () => {
		expect(progressLine(FULL_DRAFT)).toEqual({
			ready: true,
			text: "All set. Publish when you’re ready.",
		});
		expect(blockingStep(FULL_DRAFT)).toBeNull();
	});

	it("treats a bio past the limit as incomplete", () => {
		const bio = "a".repeat(XOLACER_BIO_MAX_CHARS + 1);
		expect(isStepComplete("bio", { ...FULL_DRAFT, bio })).toBe(false);
		expect(isStepComplete("bio", { ...FULL_DRAFT, bio: "   " })).toBe(false);
	});

	it("opens on the first unfinished step, or Review", () => {
		expect(resumeStep(EMPTY_DRAFT)).toBe(0);
		expect(resumeStep({ ...FULL_DRAFT, bio: "" })).toBe(2);
		expect(resumeStep(FULL_DRAFT)).toBe(LAST_STEP);
	});
});

describe("specialties", () => {
	it("picks and unpicks", () => {
		expect(toggleSpecialty([], "sleep")).toEqual(["sleep"]);
		expect(toggleSpecialty(["sleep", "grief"], "sleep")).toEqual(["grief"]);
	});

	it("ignores a new pick at the cap, but still unpicks", () => {
		const full = ["anxiety", "sleep", "grief", "family"];
		expect(full).toHaveLength(MAX_SPECIALTIES);
		expect(toggleSpecialty(full, "burnout")).toBe(full);
		expect(toggleSpecialty(full, "grief")).toEqual([
			"anxiety",
			"sleep",
			"family",
		]);
	});

	it("shows the short chip label on the card", () => {
		expect(chipLabel("anxiety")).toBe("Anxiety");
		expect(chipLabel("unknown")).toBe("unknown");
	});
});

describe("bio count", () => {
	it("warns with 20 characters left", () => {
		expect(bioCount("a".repeat(139))).toEqual({
			text: "139 / 160",
			warn: false,
		});
		expect(bioCount("a".repeat(140)).warn).toBe(true);
	});
});

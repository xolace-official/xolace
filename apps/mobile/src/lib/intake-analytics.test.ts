import type { PostHog } from "posthog-react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { intakePersonProperties } from "@/lib/intake-analytics";

describe("intakePersonProperties", () => {
	it("splits immutable facts into $set_once and drops absent series answers", () => {
		const props = intakePersonProperties({
			acquisitionSource: "friend_family",
			intent: "just_looking",
			weighingOn: ["work"],
		});

		expect(props.$set_once).toEqual({ acquisition_source: "friend_family" });
		expect(props.$set).toMatchObject({
			intent: "just_looking",
			weighing_on: ["work"],
		});
		expect(props.$set.intake_version).toBe(1);
		expect(JSON.stringify(props)).not.toContain("displayName");
	});

	it("keeps the series answers immutable when the branch ran", () => {
		const props = intakePersonProperties({
			acquisitionSource: "short_form_video",
			seriesSeen: "loved_it",
			seriesWantInApp: true,
		});

		expect(props.$set_once).toEqual({
			acquisition_source: "short_form_video",
			series_seen: "loved_it",
			series_want_in_app: true,
		});
	});
});

describe("trackFirstReflection", () => {
	let analytics: typeof import("@/lib/intake-analytics");
	let capture: ReturnType<typeof vi.fn>;
	let posthog: PostHog;

	beforeEach(async () => {
		vi.resetModules();
		vi.useFakeTimers();
		analytics = await import("@/lib/intake-analytics");
		capture = vi.fn();
		posthog = { capture } as unknown as PostHog;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	const captured = (event: string) =>
		capture.mock.calls
			.filter(([name]) => name === event)
			.map(([, props]) => props);

	it("times the first reflection from intake start, once", () => {
		analytics.startIntakeClock();
		analytics.setIntakeArm("control");
		vi.advanceTimersByTime(90_000);
		analytics.trackFirstReflection(posthog);
		analytics.trackFirstReflection(posthog);
		expect(captured("intake_first_reflection")).toEqual([
			{ intake_arm: "control", ms_since_intake_started: 90_000 },
		]);
	});

	it("stays quiet when no intake ran in this session", () => {
		analytics.trackFirstReflection(posthog);
		expect(captured("intake_first_reflection")).toEqual([]);
	});

	it("is armed again by the next intake", () => {
		analytics.startIntakeClock();
		analytics.trackFirstReflection(posthog);
		analytics.startIntakeClock();
		analytics.trackFirstReflection(posthog);
		expect(captured("intake_first_reflection")).toHaveLength(2);
	});
});

import type { PostHog } from "posthog-react-native";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("first look events (S18)", () => {
	let analytics: typeof import("@/features/plus/first-look/analytics");
	let capture: ReturnType<typeof vi.fn>;
	let posthog: PostHog;

	beforeEach(async () => {
		vi.resetModules();
		const arm = await import("@/lib/intake-analytics");
		arm.setIntakeArm("v2");
		analytics = await import("@/features/plus/first-look/analytics");
		capture = vi.fn();
		posthog = { capture } as unknown as PostHog;
	});

	const captured = (event: string) =>
		capture.mock.calls
			.filter(([name]) => name === event)
			.map(([, props]) => props);

	it("closes the step's paywall_opened with a paywall_dismissed on Continue free", () => {
		analytics.trackPlusShown(posthog);
		analytics.trackPlusContinuedFree(posthog, true);
		const surface = analytics.INTAKE_PLUS_SURFACE;
		expect(captured("paywall_opened")).toEqual([{ session_count: 0, surface }]);
		expect(captured("paywall_dismissed")).toEqual([
			{ session_count: 0, surface },
		]);
		expect(captured("intake_plus_shown")).toEqual([
			{ intake_arm: "v2", surface },
		]);
	});

	it("dismisses no paywall for someone it wasn't offered to", () => {
		analytics.trackPlusContinuedFree(posthog, false);
		expect(captured("intake_plus_continued_free")).toHaveLength(1);
		expect(captured("paywall_dismissed")).toEqual([]);
	});
});

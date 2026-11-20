import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { goHome, LANDING } from "@/lib/landing";
import { notificationTapPlan } from "@/lib/notification-tap";

const calls = vi.hoisted(() => [] as string[]);
vi.mock("expo-router", () => ({
	router: {
		dismissTo: (href: string) => calls.push(`dismissTo ${href}`),
		navigate: (href: string) => calls.push(`navigate ${href}`),
	},
}));

const PROTECTED = path.resolve(import.meta.dirname, "../app/(protected)");
const NOW = 1_700_000_000_000;

describe("the landing", () => {
	beforeEach(() => {
		calls.length = 0;
	});

	it("is Today's tab", () => {
		expect(LANDING).toBe("/today");
		expect(existsSync(path.join(PROTECTED, "(tabs)/today/index.tsx"))).toBe(
			true
		);
	});

	it('hands "/" over to it, for sign-in, intake and old links', () => {
		const index = readFileSync(path.join(PROTECTED, "index.tsx"), "utf8");
		expect(index).toContain("<ReturnTo href={LANDING} />");
	});

	it("goes home by popping to Today, then switching to it", () => {
		goHome();
		expect(calls).toEqual(["dismissTo /today", "navigate /today"]);
	});

	it("is where a notification's home goes, from a tab and from the old root", () => {
		for (const pathname of ["/", "/today", "/explore/topics", "/you"]) {
			const plan = notificationTapPlan(
				{ logId: "log", type: "gentle_return" },
				"Thinking of you",
				NOW,
				pathname
			);
			expect(plan.navigation, pathname).toEqual({ action: "home" });
		}
	});

	it("leaves Reflect where it is, and keeps the banner for Today", () => {
		const plan = notificationTapPlan(
			{ logId: "log", type: "gentle_return" },
			"Thinking of you",
			NOW,
			"/reflect"
		);
		expect(plan.navigation).toBeUndefined();
		expect(plan.banner).toEqual({
			content: "Thinking of you",
			notificationId: "log",
		});
	});
});

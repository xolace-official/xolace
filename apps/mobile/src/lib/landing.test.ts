import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LANDING } from "@/lib/landing";
import { notificationTapPlan } from "@/lib/notification-tap";

const PROTECTED = path.resolve(import.meta.dirname, "../app/(protected)");
const NOW = 1_700_000_000_000;

describe("the landing", () => {
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

	it("is where a notification's home goes, from the old root and from Reflect", () => {
		for (const pathname of ["/", "/reflect", "/today"]) {
			const plan = notificationTapPlan(
				{ logId: "log", type: "gentle_return" },
				"Thinking of you",
				NOW,
				pathname
			);
			expect(plan.navigation, pathname).toEqual({
				action: "dismissTo",
				href: "/today",
			});
		}
	});
});

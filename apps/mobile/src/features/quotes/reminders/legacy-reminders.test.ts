import { describe, expect, it } from "vitest";
import { legacyReminderIds } from "@/features/quotes/reminders/legacy-reminders";

describe("legacyReminderIds", () => {
	it("finds every old daily quote reminder and nothing else", () => {
		expect(
			legacyReminderIds([
				{ identifier: "daily-quote-morning-1" },
				{ identifier: "daily-quote-evening-7" },
				{ identifier: "streak-reminder" },
				{ identifier: "quote-of-the-day" },
			])
		).toEqual(["daily-quote-morning-1", "daily-quote-evening-7"]);
	});

	it("is empty once they're gone", () => {
		expect(legacyReminderIds([])).toEqual([]);
	});
});

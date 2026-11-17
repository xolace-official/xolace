import { describe, expect, it } from "vitest";
import { FIXTURE_FOLLOW_UPS } from "@/features/you/home/dev/fixtures";
import {
	type FollowUpCard,
	followUpItems,
	lookOf,
	waitingCount,
} from "@/features/you/home/follow-ups-model";

const { open, history } = FIXTURE_FOLLOW_UPS;
const kinds = (items: ReturnType<typeof followUpItems>) =>
	items.map((i) => (i.kind === "header" ? i.title : i.kind));

describe("followUpItems", () => {
	it("lists Waiting, Coming up, then Earlier", () => {
		expect(kinds(followUpItems(open, history, true))).toEqual([
			"Waiting",
			"card",
			"Coming up",
			"card",
			"Earlier",
			"card",
			"card",
		]);
	});

	it("skips history cards already pinned above", () => {
		const pinned = open.waiting[0] as FollowUpCard;
		const items = followUpItems(open, [pinned, ...history], true);
		expect(items.filter((i) => i.key === pinned._id)).toHaveLength(1);
	});

	it("is empty only once the history is exhausted", () => {
		const none = { upcoming: [], waiting: [] };
		expect(followUpItems(none, [], false)).toEqual([]);
		expect(kinds(followUpItems(none, [], true))).toEqual(["empty"]);
	});

	it("counts the waiting cards for the tab's badge", () => {
		expect(waitingCount(open)).toBe(1);
		expect(waitingCount(undefined)).toBe(0);
	});
});

describe("lookOf", () => {
	const waiting = open.waiting[0] as FollowUpCard;

	it("opens a check-in for a ready or shown card, from the moment's day", () => {
		expect(lookOf(waiting)).toEqual({
			from: "From Thursday",
			kind: "check-in",
		});
		expect(lookOf({ ...waiting, status: "shown" }).kind).toBe("check-in");
	});

	it("only closes a superseded card", () => {
		expect(lookOf({ ...waiting, status: "superseded" }).kind).toBe("close");
	});

	it("puts the answer beside a resolved card, quieter when dismissed or expired", () => {
		expect(lookOf(history[0] as FollowUpCard)).toMatchObject({
			answer: "Feeling lighter",
			answered: true,
			kind: "past",
		});
		expect(
			lookOf({ ...waiting, status: "resolved", userResponse: "dismissed" })
		).toMatchObject({ answer: "Closed", answered: false });
		expect(lookOf({ ...waiting, status: "expired" })).toMatchObject({
			answer: "No answer",
			answered: false,
		});
	});
});

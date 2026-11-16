// @vitest-environment edge-runtime
/**
 * The monthly prompt's state (B2, redesign "Coming back"): waiting until the
 * user reads it, writes about it or lets it pass; read and written carry it
 * to the reflect card for a week, then a scheduled mutation lets it go.
 *
 * Failure modes, written before the code:
 *  1. Let it pass still carries the prompt, or lets it come back.
 *  2. Reading twice (or reading after writing) restarts the week.
 *  3. The week never ends, or ends early, or a cleared prompt reappears.
 *  4. One user's choice changes what another sees.
 *  5. The wrong event waits: one that isn't on in the user's day, or a
 *     lower-priority one ahead of a higher one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
	asNewUser,
	asUnauthed,
	asUser,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";
import { CARRY_MS, drainPromptStates } from "./prompt";

vi.mock("../lib/aggregates", () => aggregatesMock());

const NOW = Date.UTC(2026, 5, 10, 12);
const TODAY = "2026-06-10";
const PROMPT = "What have you been carrying that nobody asks about?";

beforeEach(() => {
	vi.useFakeTimers({ now: NOW });
});

afterEach(() => {
	vi.useRealTimers();
});

type EventFields = {
	endDate?: string;
	priority?: number;
	sessionPrompt?: string | null;
	slug?: string;
	startDate?: string;
};

function addEvent(
	user: SeededUser,
	fields: EventFields = {}
): Promise<Id<"monthlyEvents">> {
	const { sessionPrompt = PROMPT, ...rest } = fields;
	return user.root.run((ctx) =>
		ctx.db.insert("monthlyEvents", {
			body: "The weight we don't say out loud.",
			endDate: "2026-06-30",
			priority: 1,
			slug: "june-2026",
			startDate: "2026-06-01",
			title: "This month",
			...rest,
			...(sessionPrompt === null ? {} : { sessionPrompt }),
		})
	);
}

const waiting = (user: SeededUser, today = TODAY) =>
	user.t.query(api.monthlyEvents.prompt.getWaiting, { today });

const carried = (user: SeededUser) =>
	user.t.query(api.monthlyEvents.prompt.getCarried, {});

const choose = (
	user: SeededUser,
	eventId: Id<"monthlyEvents">,
	choice: "read" | "passed" | "written"
) => user.t.mutation(api.monthlyEvents.prompt.choose, { choice, eventId });

const stateRows = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("monthly_event_states")
			.withIndex("by_emotionalProfileId_and_eventId", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.collect()
	);

/** Moves the clock and runs whatever came due. */
async function advance(user: SeededUser, ms: number) {
	vi.advanceTimersByTime(ms);
	await user.root.finishInProgressScheduledFunctions();
}

describe("waiting", () => {
	it("waits while the event is on in the user's day", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user);
		expect((await waiting(user))?._id).toBe(eventId);
		expect(await waiting(user, "2026-05-31")).toBeNull();
		expect(await waiting(user, "2026-06-30")).not.toBeNull();
		expect(await waiting(user, "2026-07-01")).toBeNull();
	});

	it("offers the highest-priority event that's on", async () => {
		const user = await asNewUser();
		await addEvent(user, { priority: 2, slug: "later" });
		const first = await addEvent(user, { priority: 1, slug: "first" });
		expect((await waiting(user))?._id).toBe(first);
	});

	it("moves on to the next event once one is chosen", async () => {
		const user = await asNewUser();
		const first = await addEvent(user, { priority: 1, slug: "first" });
		const second = await addEvent(user, { priority: 2, slug: "second" });
		await choose(user, first, "passed");
		expect((await waiting(user))?._id).toBe(second);
	});

	it("rejects a day that isn't YYYY-MM-DD", async () => {
		const user = await asNewUser();
		await expect(waiting(user, "10/06/2026")).rejects.toThrow(/invalid_day/);
	});
});

describe("let it pass", () => {
	it("carries nothing and never comes back", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user);
		expect(await choose(user, eventId, "passed")).toEqual({
			choice: "passed",
		});
		expect(await waiting(user)).toBeNull();
		expect(await carried(user)).toBeNull();
		await advance(user, 2 * CARRY_MS);
		expect(await waiting(user, "2026-06-29")).toBeNull();
	});

	it("is final: a later read or write changes nothing", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user);
		await choose(user, eventId, "passed");
		expect(await choose(user, eventId, "read")).toEqual({ choice: "passed" });
		expect(await choose(user, eventId, "written")).toEqual({
			choice: "passed",
		});
		expect(await carried(user)).toBeNull();
	});
});

describe("read and written: kept for 7 days", () => {
	it("carries the prompt to the reflect card for a week from the read", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user);
		const result = await choose(user, eventId, "read");
		expect(result).toEqual({ carryUntil: NOW + CARRY_MS, choice: "read" });
		expect(await waiting(user)).toBeNull();
		expect(await carried(user)).toEqual({
			carryUntil: NOW + CARRY_MS,
			choice: "read",
			eventId,
			prompt: PROMPT,
			slug: "june-2026",
			title: "This month",
		});
	});

	it("written carries it the same way", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user);
		await choose(user, eventId, "written");
		expect(await carried(user)).toMatchObject({
			carryUntil: NOW + CARRY_MS,
			choice: "written",
		});
	});

	it("read can become written, without restarting the week", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user);
		await choose(user, eventId, "read");
		await advance(user, 2 * 24 * 60 * 60 * 1000);
		expect(await choose(user, eventId, "written")).toEqual({
			carryUntil: NOW + CARRY_MS,
			choice: "written",
		});
		expect(await choose(user, eventId, "read")).toEqual({
			carryUntil: NOW + CARRY_MS,
			choice: "written",
		});
		expect(await stateRows(user)).toHaveLength(1);
	});

	it("carries nothing for an event without a prompt", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user, { sessionPrompt: null });
		expect(await choose(user, eventId, "read")).toEqual({ choice: "read" });
		expect(await carried(user)).toBeNull();
		expect(await waiting(user)).toBeNull();
	});

	it("survives two taps at once as one row", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user);
		const results = await Promise.allSettled([
			choose(user, eventId, "read"),
			choose(user, eventId, "read"),
		]);
		expect(results.every((r) => r.status === "fulfilled")).toBe(true);
		expect(await stateRows(user)).toHaveLength(1);
	});
});

describe("expiry", () => {
	it("lets the prompt go when its week is up, not before", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user);
		await choose(user, eventId, "read");
		await advance(user, CARRY_MS - 1);
		expect(await carried(user)).not.toBeNull();
		await advance(user, 1);
		expect(await carried(user)).toBeNull();
		// Expired, not undone: the prompt doesn't wait on the greeting again.
		expect(await waiting(user)).toBeNull();
		expect((await stateRows(user))[0]?.choice).toBe("read");
	});

	it("clearCarried takes it off early, and the expiry still runs cleanly", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user);
		await choose(user, eventId, "read");
		expect(
			await user.t.mutation(api.monthlyEvents.prompt.clearCarried, {
				eventId,
			})
		).toBeNull();
		expect(await carried(user)).toBeNull();
		await advance(user, CARRY_MS);
		expect(await carried(user)).toBeNull();
		expect(await choose(user, eventId, "written")).toEqual({
			choice: "written",
		});
		expect(await carried(user)).toBeNull();
	});

	it("an expiry that runs early leaves the week alone", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user);
		await choose(user, eventId, "read");
		const [row] = await stateRows(user);
		if (!row) {
			throw new Error("no state row");
		}
		await user.root.mutation(internal.monthlyEvents.prompt.expireCarry, {
			stateId: row._id,
		});
		expect(await carried(user)).not.toBeNull();
	});

	it("shows the latest-ending prompt when two are carried", async () => {
		const user = await asNewUser();
		const may = await addEvent(user, {
			endDate: "2026-05-31",
			slug: "may",
			startDate: "2026-05-01",
		});
		const june = await addEvent(user, { slug: "june" });
		await choose(user, may, "read");
		await advance(user, 60_000);
		await choose(user, june, "read");
		expect((await carried(user))?.eventId).toBe(june);
	});

	it("skips a carried prompt whose event was deleted", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user);
		await choose(user, eventId, "read");
		await user.root.run((ctx) => ctx.db.delete("monthlyEvents", eventId));
		expect(await carried(user)).toBeNull();
	});
});

describe("auth", () => {
	it("needs a signed-in user for every call", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user);
		const anon = user.root;
		await expect(
			anon.query(api.monthlyEvents.prompt.getWaiting, { today: TODAY })
		).rejects.toThrow(/not_authenticated|Not authenticated/);
		await expect(
			anon.query(api.monthlyEvents.prompt.getCarried, {})
		).rejects.toThrow(/Not authenticated/);
		await expect(
			anon.mutation(api.monthlyEvents.prompt.choose, {
				choice: "read",
				eventId,
			})
		).rejects.toThrow(/Not authenticated/);
		await expect(
			anon.mutation(api.monthlyEvents.prompt.clearCarried, { eventId })
		).rejects.toThrow(/Not authenticated/);
	});

	it("needs a users row, not just a token", async () => {
		await expect(
			asUser(9, asUnauthed()).query(api.monthlyEvents.prompt.getCarried, {})
		).rejects.toThrow(/User not found/);
	});

	it("keeps one user's choice from another", async () => {
		const ama = await asNewUser(1);
		const kofi = await asNewUser(2, ama.root);
		const eventId = await addEvent(ama);
		await choose(ama, eventId, "read");
		expect(await waiting(kofi)).not.toBeNull();
		expect(await carried(kofi)).toBeNull();
		await choose(kofi, eventId, "passed");
		expect(await carried(ama)).toMatchObject({ choice: "read", eventId });
		await kofi.t.mutation(api.monthlyEvents.prompt.clearCarried, { eventId });
		expect(await carried(ama)).not.toBeNull();
	});

	it("refuses an event that doesn't exist", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user);
		await user.root.run((ctx) => ctx.db.delete("monthlyEvents", eventId));
		await expect(choose(user, eventId, "read")).rejects.toThrow(
			/event_not_found/
		);
	});
});

describe("erasure", () => {
	it("a data wipe and account deletion drop the user's choices", async () => {
		const user = await asNewUser();
		const eventId = await addEvent(user);
		await choose(user, eventId, "read");
		await user.root.mutation(internal.jobs.dataWipe.wipe, {
			emotionalProfileId: user.profileId,
		});
		expect(await stateRows(user)).toEqual([]);

		await choose(user, eventId, "passed");
		await user.root.run((ctx) => drainPromptStates(ctx, user.profileId));
		expect(await stateRows(user)).toEqual([]);
	});
});

// @vitest-environment edge-runtime
/**
 * #773: how long an inbound update is kept. Driven through the real webhook
 * route, the `telegramInbound` pool and the two retention crons. What can go
 * wrong: a handled update keeps the person's text; a row outlives its 30
 * days or goes early; an update the pool lost is never handled, or one that
 * keeps failing is put back forever.
 */
import { describe, expect, it, vi } from "vitest";
import { internal } from "../../_generated/api";
import { asNewUser } from "../../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../../test/mocks.helpers";
import { HELP } from "./copy";
import {
	type Backend,
	backend,
	configure,
	DAY,
	events,
	forgetCalls,
	HOUR,
	linkChat,
	messageUpdate,
	post,
	processSoon,
	replies,
	STRANGER_CHAT,
	setTelegram,
	stubTelegramEachTest,
} from "./telegram.helpers";

vi.mock("../../lib/aggregates", () => aggregatesMock());
vi.mock("../../revenuecat", () => revenuecatMock(() => false));

stubTelegramEachTest();

const MINUTE = 60_000;

const eventOf = async (t: Backend, update: { update_id: number }) =>
	(await events(t)).find((e) => e.providerEventId === String(update.update_id));

async function linked() {
	const user = await asNewUser();
	backend(user.root);
	const secret = await configure(user.root);
	await setTelegram(user, { enabled: true, plan: "free" });
	await linkChat(user, secret);
	forgetCalls();
	return { secret, user };
}

describe("inbound retention", () => {
	it("keeps no text once an update is handled", async () => {
		const { secret, user } = await linked();
		await post(user.root, messageUpdate(STRANGER_CHAT, "/help"), secret);
		await processSoon(user.root);

		const handled = await events(user.root);
		expect(handled.map((e) => e.status)).not.toContain("received");
		expect(JSON.stringify(handled)).not.toContain("/help");
	});

	it("deletes rows after 30 days, and no sooner", async () => {
		const { secret, user } = await linked();
		const old = (await events(user.root)).map((e) => e._id);
		vi.advanceTimersByTime(30 * DAY - HOUR);
		await post(user.root, messageUpdate(STRANGER_CHAT, "/help"), secret);
		await processSoon(user.root);
		vi.advanceTimersByTime(2 * HOUR);

		await user.root.mutation(
			internal.outreach.telegram.retention.purgeOldInbound,
			{}
		);

		const left = (await events(user.root)).map((e) => e._id);
		expect(old).toHaveLength(1);
		expect(left).toHaveLength(1);
		expect(left).not.toContain(old[0]);
	});

	it("puts an update stuck in received for 5 minutes back on the pool", async () => {
		const { user } = await linked();
		const update = messageUpdate(STRANGER_CHAT, "/help");
		await user.root.run((ctx) =>
			ctx.db.insert("inbound_events", {
				channel: "telegram",
				externalId: String(STRANGER_CHAT),
				payload: update,
				providerEventId: String(update.update_id),
				receivedAt: Date.now(),
				status: "received",
			})
		);
		const requeue = () =>
			user.root.mutation(internal.outreach.telegram.retention.requeueStuck, {});

		vi.advanceTimersByTime(4 * MINUTE);
		await requeue();
		await processSoon(user.root);
		expect(replies()).toEqual([]);

		vi.advanceTimersByTime(2 * MINUTE);
		await requeue();
		await processSoon(user.root);
		expect(replies()).toEqual([HELP]);
		expect((await eventOf(user.root, update))?.status).toBe("processed");
	});

	it("leaves an update still waiting its turn on the pool", async () => {
		const { secret, user } = await linked();
		const update = messageUpdate(STRANGER_CHAT, "/help");
		await post(user.root, update, secret);
		vi.advanceTimersByTime(20 * MINUTE);
		// As if it had been put back once already, and was still queued.
		const queued = await eventOf(user.root, update);
		if (!queued) {
			throw new Error("no event");
		}
		await user.root.run((ctx) =>
			ctx.db.patch("inbound_events", queued._id, {
				requeuedAt: Date.now() - 10 * MINUTE,
			})
		);

		await user.root.mutation(
			internal.outreach.telegram.retention.requeueStuck,
			{}
		);
		expect((await eventOf(user.root, update))?.status).toBe("received");

		await processSoon(user.root);
		expect(replies()).toEqual([HELP]);
		expect((await eventOf(user.root, update))?.status).toBe("processed");
	});

	it("marks an update still stuck after it was put back failed, without its text", async () => {
		const { user } = await linked();
		const update = messageUpdate(STRANGER_CHAT, "/help");
		await user.root.run((ctx) =>
			ctx.db.insert("inbound_events", {
				channel: "telegram",
				externalId: String(STRANGER_CHAT),
				payload: update,
				providerEventId: String(update.update_id),
				receivedAt: Date.now() - 20 * MINUTE,
				requeuedAt: Date.now() - 10 * MINUTE,
				status: "received",
			})
		);

		await user.root.mutation(
			internal.outreach.telegram.retention.requeueStuck,
			{}
		);
		await processSoon(user.root);

		const event = await eventOf(user.root, update);
		expect(event?.status).toBe("failed");
		expect(JSON.stringify(event?.payload)).not.toContain("/help");
		expect(replies()).toEqual([]);
	});
});

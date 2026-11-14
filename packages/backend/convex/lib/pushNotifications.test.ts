// @vitest-environment edge-runtime
/**
 * `sendPushToProfile`'s reach, against the real push component. What can go
 * wrong: a profile with nowhere to receive a push (no token at all, or every
 * device reaped) reads as reached, so the outreach layer never falls back
 * from push (outreach-layer.md §3, `no_device`).
 */
import pushNotificationsTest from "@convex-dev/expo-push-notifications/test";
import { describe, expect, it, vi } from "vitest";
import type { Id } from "../_generated/dataModel";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";
import { PUSH_DEVICE_MAX_AGE_MS } from "./pushDevices";
import { pushNotifications, sendPushToProfile } from "./pushNotifications";

vi.mock("./aggregates", () => aggregatesMock());

const notification = { body: "It's been a little while.", title: "Xolace" };

async function user(): Promise<SeededUser> {
	const seeded = await asNewUser();
	pushNotificationsTest.register(seeded.root);
	return seeded;
}

const addDevice = (u: SeededUser, lastRegisteredAt: number, n = 1) =>
	u.root.run(async (ctx) => {
		const token = `ExponentPushToken[device-${n}]`;
		const deviceId = await ctx.db.insert("push_devices", {
			emotionalProfileId: u.profileId,
			expoPushToken: token,
			lastRegisteredAt,
		});
		await pushNotifications.recordToken(ctx, {
			pushToken: token,
			userId: deviceId,
		});
		return deviceId;
	});

const send = (u: SeededUser) =>
	u.root.run((ctx) =>
		sendPushToProfile(ctx, {
			emotionalProfileId: u.profileId,
			notification,
		})
	);

describe("sendPushToProfile", () => {
	it("reaches nobody when the profile has no token at all", async () => {
		const u = await user();
		expect(await send(u)).toBe(0);
	});

	it("reaches the pre-registry profile-keyed recipient", async () => {
		const u = await user();
		await u.root.run((ctx) =>
			pushNotifications.recordToken(ctx, {
				pushToken: "ExponentPushToken[legacy]",
				userId: u.profileId,
			})
		);
		expect(await send(u)).toBe(1);
	});

	it("counts every live device", async () => {
		const u = await user();
		await addDevice(u, Date.now(), 1);
		await addDevice(u, Date.now(), 2);
		expect(await send(u)).toBe(2);
	});

	it("reaches nobody once every device has been reaped", async () => {
		const u = await user();
		const deviceId: Id<"push_devices"> = await addDevice(
			u,
			Date.now() - PUSH_DEVICE_MAX_AGE_MS - 1
		);
		expect(await send(u)).toBe(0);
		expect(
			await u.root.run((ctx) => ctx.db.get("push_devices", deviceId))
		).toBeNull();
	});
});

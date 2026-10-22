// @vitest-environment edge-runtime
/**
 * The insights screen's free view (#517). Failure modes: a per-domain number
 * (steadiness, baseline, raw means, readings) reaching the client; the overall
 * dial lighting up before two domains are unlocked; a texture-only user seeing
 * a domain; quiet domains sorted among the live ones or warming ones ahead of
 * them; a quiet domain without the date it was last seen.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { seedMetadata, seedSession } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
let plus = false;
vi.mock("../revenuecat", () => revenuecatMock(() => plus));

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 8, 12);

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["Date"] });
	vi.setSystemTime(NOW);
});
afterEach(() => {
	vi.useRealTimers();
	plus = false;
});

async function seed(
	user: SeededUser,
	daysAgo: number,
	tags: string[],
	intensity = 5
) {
	const at = NOW - daysAgo * DAY;
	const sessionId = await seedSession(user.root, user.profileId, {
		confirmationState: "confirmed",
		createdAt: at,
		state: "completed",
	});
	await seedMetadata(user.root, sessionId, user.profileId, {
		createdAt: at,
		intensity,
		primaryEmotion: "anxiety",
		thematicTags: tags,
	});
	return sessionId;
}

const read = (user: SeededUser) =>
	user.t.query(api.compounding.insights.freeView, { now: Date.now() });

describe("compounding/insights.freeView", () => {
	it("gives a texture-only user no domains and no overall", async () => {
		const user = await asNewUser();
		await seed(user, 0, ["loss", "trauma"]);
		expect(await read(user)).toEqual({
			domains: [],
			overall: null,
			upsell: null,
		});
	});

	it("keeps the overall dial dark at one unlocked domain", async () => {
		const user = await asNewUser();
		for (const d of [0, 1, 2]) {
			await seed(user, d, ["work"]);
		}
		await seed(user, 0, ["family"]);
		const out = await read(user);
		expect(out.overall).toBeNull();
		expect(out.domains.map((d) => [d.domain, d.state])).toEqual([
			["work", "unlocked"],
			["family", "warming"],
		]);
	});

	it("shows a rounded overall at two unlocked, and no per-domain number", async () => {
		const user = await asNewUser();
		for (const d of [0, 1, 2]) {
			await seed(user, d, ["work"], 4);
			await seed(user, d, ["sleep"], 7);
		}
		const out = await read(user);
		expect(Number.isInteger(out.overall)).toBe(true);
		expect(out.overall).toBe(Math.round((100 - 300 / 9 + (100 - 600 / 9)) / 2));
		for (const d of out.domains) {
			expect(Object.keys(d).sort()).toEqual(["domain", "lastSeenAt", "state"]);
		}
	});

	it("puts quiet domains after live ones and warming last, with a last-seen date", async () => {
		const user = await asNewUser();
		await seed(user, 0, ["finances"]);
		for (const d of [40, 41, 42]) {
			await seed(user, d, ["family"]);
		}
		for (const d of [0, 1, 2]) {
			await seed(user, d, ["work"]);
		}
		const out = await read(user);
		expect(out.domains).toEqual([
			{ domain: "work", lastSeenAt: null, state: "unlocked" },
			{ domain: "family", lastSeenAt: NOW - 40 * DAY, state: "unlocked" },
			{ domain: "money", lastSeenAt: null, state: "warming" },
		]);
	});
});

/**
 * plusView (#518). Failure modes: numbers reaching a free (or lapsed) user;
 * a baseline before settled or a number while warming; a trend chip for a
 * domain warming a week ago; upgrade needing a backfill before history shows.
 * #520: a compounding domain not ranked first, or a steady one marked; its
 * usual shown live instead of the anchor it's judged against; the
 * hand-off offered for a kindling lit before the stretch began; the
 * Kindling hand-off offered for a domain tonight's kindling never touched.
 */
describe("compounding/insights.plusView", () => {
	const readPlus = (user: SeededUser) =>
		user.t.query(api.compounding.insights.plusView, { now: Date.now() });

	it("is null without Xolace+, and again after a lapse", async () => {
		const user = await asNewUser();
		for (const d of [0, 1, 2]) {
			await seed(user, d, ["work"]);
		}
		expect(await readPlus(user)).toBeNull();
		plus = true;
		expect(await readPlus(user)).not.toBeNull();
		plus = false;
		expect(await readPlus(user)).toBeNull();
		expect((await read(user)).domains).toHaveLength(1); // nothing deleted
	});

	it("shows numbers, the usual once settled, and last week's trend straight after upgrading", async () => {
		const user = await asNewUser();
		for (const d of [30, 25, 20, 15, 10]) {
			await seed(user, d, ["work"], 4);
		}
		await seed(user, 1, ["work"], 8);
		for (const d of [0, 1, 2]) {
			await seed(user, d, ["sleep"], 6);
		}
		await seed(user, 0, ["family"]);
		plus = true;
		const out = (await readPlus(user))!;
		const [work, health, family] = out.domains;

		expect(work).toMatchObject({ domain: "work", state: "settled" });
		expect(Number.isInteger(work.steadiness)).toBe(true);
		expect(Number.isInteger(work.baseline)).toBe(true);
		expect(work.trend).toBeLessThan(0);

		expect(health).toMatchObject({
			baseline: null,
			domain: "health",
			state: "unlocked",
			trend: null,
		});
		expect(health.steadiness).toBe(Math.round(100 - 500 / 9));

		expect(family).toMatchObject({
			baseline: null,
			state: "warming",
			steadiness: null,
			trend: null,
		});
		// Only work was unlocked a week ago.
		expect(out.overallTrend).toBeNull();
		expect(out.overall).toBe((await read(user)).overall);
	});

	/** A settled work usual (intensity 4), then a heavy last week (10). */
	async function compoundingWork(user: SeededUser) {
		for (let i = 0; i < 50; i++) {
			await seed(user, 120 - i * 2, ["work"], 4);
		}
		for (let d = 1; d <= 7; d++) {
			await seed(user, d + 0.5, ["work"], 10);
		}
		await user.root.run((ctx) =>
			ctx.db.insert("compounding_stretches", {
				anchorBaseline: 67,
				domain: "work",
				emotionalProfileId: user.profileId,
				startedAt: NOW - 5 * DAY,
			})
		);
	}

	const activeKindling = (
		user: SeededUser,
		sessionId: Id<"sessions">,
		generatedAt = NOW
	) =>
		user.root.run((ctx) =>
			ctx.db.insert("paths", {
				emotionalProfileId: user.profileId,
				generatedAt,
				model: "test",
				modelVersion: "test",
				sessionId,
				status: "active",
			})
		);

	it("ranks a compounding domain first and marks only it", async () => {
		const user = await asNewUser();
		for (let i = 0; i < 50; i++) {
			await seed(user, 120 - i * 2, ["self-worth"], 4);
		}
		await compoundingWork(user);
		plus = true;
		const out = (await readPlus(user))!;
		expect(out.domains.map((d) => [d.domain, d.compounding])).toEqual([
			["work", "compounding"],
			["self", null],
		]);
		// "Your usual" is the anchor the stretch is judged against, not the sinking live one.
		expect(out.domains[0].baseline).toBe(67);
		expect(out.domains[1].baseline).toBe(67); // steady Self keeps its live usual
	});

	it("offers Kindling only for a compounding domain the active kindling's session touched", async () => {
		const user = await asNewUser();
		await compoundingWork(user);
		for (const d of [0.2, 1, 2]) {
			await seed(user, d, ["sleep"], 4);
		}
		plus = true;

		await activeKindling(user, await seed(user, 0.1, ["sleep"], 4));
		expect(
			(await readPlus(user))!.domains.map((d) => [d.domain, d.kindling])
		).toEqual([
			["work", false],
			["health", false],
		]);

		await user.root.run(async (ctx) => {
			for (const p of await ctx.db.query("paths").collect()) {
				await ctx.db.patch("paths", p._id, { status: "replaced" });
			}
		});
		await activeKindling(user, await seed(user, 0.1, ["burnout", "sleep"], 4));
		expect(
			(await readPlus(user))!.domains.map((d) => [d.domain, d.kindling])
		).toEqual([
			["work", true],
			["health", false],
		]);
	});

	it("offers no hand-off for a kindling lit before the stretch began", async () => {
		const user = await asNewUser();
		await compoundingWork(user); // the stretch started 5 days ago
		plus = true;
		await activeKindling(user, await seed(user, 6, ["work"], 4), NOW - 6 * DAY);
		expect((await readPlus(user))!.domains[0]).toMatchObject({
			domain: "work",
			kindling: false,
		});
	});
});

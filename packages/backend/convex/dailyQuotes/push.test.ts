// @vitest-environment edge-runtime
/**
 * B19: the daily quote push, driven through its sweep (the cron's target)
 * with the real outreach layer, rate limiter and workpool, and
 * `sendPushToProfile` mocked. What can go wrong: a push for a quote not made
 * yet, or already open; a personalised quote's words on the lock screen or in
 * Telegram; the quiet window or the crisis hold ignored, or a held send
 * counted against the person; the backoff stepping at the wrong count, not
 * starting over when a quote is opened, or pausing without its one last line;
 * a migrated opt-in lost, or a declined one turned back on; a channel taking
 * the intent it shouldn't.
 */
import workpoolTest from "@convex-dev/workpool/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import rateLimiterSchema from "../../node_modules/@convex-dev/rate-limiter/src/component/schema";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { seedSession } from "../test/fixtures.helpers";
import { asAdmin, asNewUser, type SeededUser } from "../test/harness.helpers";
import {
	aggregatesMock,
	noopJob,
	posthogMock,
	revenuecatMock,
} from "../test/mocks.helpers";
import { DAILY_QUOTE_COPY, openingWords } from "./copy";

type Sent = {
	emotionalProfileId: string;
	notification: {
		body: string;
		data: Record<string, unknown>;
		title: string;
	};
};

const h = vi.hoisted(() => ({
	plus: false,
	pushes: [] as Sent[],
	telegram: { configured: false, sends: [] as Doc<"outreach">[] },
}));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock(() => h.plus));
vi.mock("../posthog", () => posthogMock());
vi.mock("../lib/pushNotifications", async (orig) => ({
	...(await orig<typeof import("../lib/pushNotifications")>()),
	prunePushDeviceHistory: async () => null,
	pushNotifications: {
		recordToken: async () => null,
		removeToken: async () => null,
	},
	sendPushToProfile: async (_ctx: unknown, args: Sent) => {
		h.pushes.push(args);
		return 1;
	},
}));
vi.mock("../streamSetup", async (orig) => ({
	...(await orig<typeof import("../streamSetup")>()),
	addToXolaceChannel: noopJob(),
}));
// A stand-in Telegram, as in outreach/enqueue.test.ts: routing is what's
// under test here; the real adapter's message is checked on its own below.
vi.mock("../outreach/adapters", async (orig) => {
	const real = await orig<typeof import("../outreach/adapters")>();
	const push = real.ADAPTERS.push;
	if (!push) {
		throw new Error("push adapter missing");
	}
	return {
		...real,
		ADAPTERS: {
			...real.ADAPTERS,
			telegram: {
				channel: "telegram",
				configured: () => h.telegram.configured,
				deliveryMode: "push",
				pool: push.pool,
				send: async (
					_ctx: unknown,
					_delivery: unknown,
					outreach: Doc<"outreach">
				) => {
					h.telegram.sends.push(outreach);
					return { providerChatId: "1", providerMessageId: "2" };
				},
			},
		},
	};
});

// Modules that reach `../revenuecat` load after the mocks are ready: a static
// import would run before `revenuecatMock` is initialised.
const channels = () => import("../outreach/channels");
const router = () => import("../outreach/router");
const telegramAdapter = () => import("../outreach/telegram/adapter");
const push = () => import("./push");
const schedule = () => import("./schedule");

const rateLimiterModules = import.meta.glob(
	"../../node_modules/@convex-dev/rate-limiter/src/component/**/*.ts"
);

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
/** Day 0, 07:00 UTC; the morning slot is 08:00 UTC for a UTC person. */
const START = Date.UTC(2026, 10, 13, 7, 0);
const MORNING = 8 * HOUR;
const CURATED =
	"You don't have to carry the whole day at once. Set one thing down, and see what's lighter.";

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(START);
	h.plus = false;
	h.pushes.length = 0;
	h.telegram.configured = false;
	h.telegram.sends.length = 0;
});
afterEach(() => vi.useRealTimers());

/** Midnight UTC of day `n`. */
const dayStart = (n: number) => START - 7 * HOUR + n * DAY;
const dateOf = (n: number) =>
	new Date(dayStart(n)).toISOString().split("T")[0] as string;

const setNotifications = (
	user: SeededUser,
	notifications: Partial<Doc<"preferences">["notifications"]>
) =>
	user.root.run(async (ctx) => {
		const p = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique();
		if (!p) {
			throw new Error("no preferences row");
		}
		await ctx.db.patch("preferences", p._id, {
			notifications: { ...p.notifications, ...notifications },
		});
	});

const prefsOf = (user: SeededUser) =>
	user.root.run(async (ctx) => {
		const p = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique();
		if (!p) {
			throw new Error("no preferences row");
		}
		return p;
	});

const rowOf = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("daily_quote_pushes")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.unique()
	);

const outreachOf = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("outreach")
			.withIndex("by_profile_created", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.collect()
	);

/**
 * Sign-up schedules jobs days out (an achievement fold a week on); draining
 * them runs the fake clock ahead, so it goes back to the start afterwards.
 * Left pending, the first drain of a test would jump the week instead.
 */
async function settleSignup(user: SeededUser): Promise<void> {
	await drain(user);
	vi.setSystemTime(START);
}

function register(user: SeededUser): void {
	user.root.registerComponent(
		"rateLimiter",
		rateLimiterSchema,
		rateLimiterModules
	);
	workpoolTest.register(user.root, "outreachPush");
}

/** Push on (UTC, no quiet window), and the daily quote on at `slot`. */
async function subscribed(
	slot: "morning" | "afternoon" | "evening" = "morning"
): Promise<SeededUser> {
	const user = await asNewUser();
	register(user);
	await settleSignup(user);
	await setNotifications(user, { enabled: true, timezone: "UTC" });
	await user.t.mutation(api.preferences.update, {
		notificationDailyQuote: { enabled: true, slot },
	});
	return user;
}

async function seedQuote(
	user: SeededUser,
	n: number,
	type: "curated" | "session" = "curated",
	text = CURATED
): Promise<Id<"daily_quotes">> {
	return await user.root.run((ctx) =>
		ctx.db.insert("daily_quotes", {
			createdAt: dayStart(n),
			date: dateOf(n),
			emotionalProfileId: user.profileId,
			isPremium: type === "session",
			text,
			type,
		})
	);
}

const sweep = (user: SeededUser) =>
	user.root.mutation(internal.dailyQuotes.push.sweep, {});

const drain = (user: SeededUser) =>
	user.root.finishAllScheduledFunctions(vi.runAllTimers);

/**
 * Day `n` at 08:05: today's quote made (unless `made: false`), the sweep
 * run and the deliveries drained. How many pushes went.
 */
async function morning(
	user: SeededUser,
	n: number,
	{ made = true }: { made?: boolean } = {}
): Promise<{ pushes: number; quoteId: Id<"daily_quotes"> | null }> {
	const quoteId = made ? await seedQuote(user, n) : null;
	vi.setSystemTime(dayStart(n) + MORNING + 5 * MINUTE);
	const before = h.pushes.length;
	await sweep(user);
	await drain(user);
	return { pushes: h.pushes.length - before, quoteId };
}

describe("openingWords", () => {
	it("keeps a quote that fits whole", () => {
		expect(openingWords("Rest is part of it.")).toBe("Rest is part of it.");
	});

	it("cuts on a word, drops trailing punctuation and ends in an ellipsis", () => {
		const words = openingWords(CURATED);
		expect(words).toBe(
			"You don't have to carry the whole day at once. Set one thing down, and…"
		);
		expect(words.length).toBeLessThanOrEqual(73);
		expect(openingWords("one, two, three four", 10)).toBe("one, two…");
	});
});

describe("nextSlotAt", () => {
	it("is the next local start of the slot, strictly after", async () => {
		const { nextSlotAt } = await schedule();
		const eight = dayStart(0) + MORNING;
		expect(nextSlotAt("UTC", "morning", eight - 1)).toBe(eight);
		expect(nextSlotAt("UTC", "morning", eight)).toBe(eight + DAY);
		expect(nextSlotAt("UTC", "evening", eight)).toBe(dayStart(0) + 19 * HOUR);
	});

	it("follows the person's zone across a clock change", async () => {
		const { nextSlotAt } = await schedule();
		// New York leaves daylight time on 1 Nov 2026: 08:00 is 12:00Z, then 13:00Z.
		const before = nextSlotAt(
			"America/New_York",
			"morning",
			Date.UTC(2026, 9, 30, 13)
		);
		expect(before).toBe(Date.UTC(2026, 9, 31, 12));
		expect(nextSlotAt("America/New_York", "morning", before)).toBe(
			Date.UTC(2026, 10, 1, 13)
		);
	});

	it("falls back to UTC with no zone or an unknown one", async () => {
		const { nextSlotAt } = await schedule();
		const at = dayStart(0);
		expect(nextSlotAt(undefined, "morning", at)).toBe(at + MORNING);
		expect(nextSlotAt("Not/AZone", "morning", at)).toBe(at + MORNING);
	});
});

describe("the push", () => {
	it("sends a curated quote's opening words and opens Quotes on it", async () => {
		const user = await subscribed();
		const { pushes, quoteId } = await morning(user, 0);
		expect(pushes).toBe(1);
		expect(h.pushes[0]?.notification).toMatchObject({
			body: `“${openingWords(CURATED)}”`,
			data: { quoteId, screen: "quotes", type: "daily_quote" },
			title: DAILY_QUOTE_COPY.title,
		});
		const [outreach] = await outreachOf(user);
		expect(outreach).toMatchObject({
			intent: "daily_quote",
			moment: { kind: "daily_quote", quoteId },
			variants: { telegram: { body: DAILY_QUOTE_COPY.title, quote: CURATED } },
		});
	});

	it("keeps a personalised quote's words off the lock screen and out of Telegram", async () => {
		h.plus = true;
		const user = await subscribed();
		const sessionQuote = await seedQuote(
			user,
			0,
			"session",
			"What you named on Tuesday is still worth naming."
		);
		await morning(user, 0);
		expect(h.pushes[0]?.notification).toMatchObject({
			body: DAILY_QUOTE_COPY.personal,
			data: { quoteId: sessionQuote, screen: "quotes" },
		});
		const [outreach] = await outreachOf(user);
		expect(outreach?.variants).toEqual({
			telegram: { body: DAILY_QUOTE_COPY.personal },
		});
	});

	it("waits for today's quote to be made, then skips the day once the slot is long gone", async () => {
		const user = await subscribed();
		const first = await morning(user, 0, { made: false });
		expect(first.pushes).toBe(0);
		expect((await rowOf(user))?.dueAt).toBe(Date.now() + 15 * MINUTE);

		// Made a quarter hour later: it goes.
		await seedQuote(user, 0);
		vi.setSystemTime(dayStart(0) + MORNING + 20 * MINUTE);
		await sweep(user);
		await drain(user);
		expect(h.pushes).toHaveLength(1);

		// Never made the next day: retried until two hours on, then tomorrow.
		vi.setSystemTime(dayStart(1) + MORNING + 5 * MINUTE);
		for (let i = 0; i < 9; i++) {
			await sweep(user);
			vi.advanceTimersByTime(15 * MINUTE);
		}
		expect(h.pushes).toHaveLength(1);
		expect((await rowOf(user))?.dueAt).toBe(dayStart(2) + MORNING);
	});

	it("skips a day whose quote is already open", async () => {
		const user = await subscribed();
		const quoteId = await seedQuote(user, 0);
		await user.t.mutation(api.dailyQuotes.opened.markOpened, { quoteId });
		vi.setSystemTime(dayStart(0) + MORNING + 5 * MINUTE);
		await sweep(user);
		await drain(user);
		expect(h.pushes).toHaveLength(0);
		expect(await outreachOf(user)).toHaveLength(0);
		expect((await rowOf(user))?.dueAt).toBe(dayStart(1) + MORNING);
	});

	it("waits out the quiet window, and stands down if the quote is opened meanwhile", async () => {
		const user = await subscribed();
		await setNotifications(user, {
			quietWindow: { dontReachAfter: 22, dontReachBefore: 10 },
		});
		const quoteId = await seedQuote(user, 0);
		vi.setSystemTime(dayStart(0) + MORNING + 5 * MINUTE);
		await sweep(user);
		const [deferred] = await outreachOf(user);
		expect(deferred?.sendAt).toBe(dayStart(0) + 10 * HOUR);

		vi.setSystemTime(dayStart(0) + 9 * HOUR);
		await user.t.mutation(api.dailyQuotes.opened.markOpened, { quoteId });
		await drain(user);
		expect(h.pushes).toHaveLength(0);
		expect(await outreachOf(user)).toMatchObject([
			{ outcome: "suppressed", suppressedReason: "moment_seen" },
		]);
	});

	it("goes at the quiet window's end when the quote is still unopened", async () => {
		const user = await subscribed();
		await setNotifications(user, {
			quietWindow: { dontReachAfter: 22, dontReachBefore: 10 },
		});
		await morning(user, 0);
		expect(h.pushes).toHaveLength(1);
	});

	it("holds through a crisis and doesn't count it against the person", async () => {
		const user = await subscribed();
		const sessionId = await seedSession(user.root, user.profileId);
		await user.root.run((ctx) =>
			ctx.db.insert("escalation_events", {
				actionTaken: "resources_shown",
				createdAt: dayStart(0),
				emotionalProfileId: user.profileId,
				resourcesPresented: [],
				reviewedByHuman: false,
				sessionId,
				triggerConfidence: 0.9,
				triggerEvidence: "test",
				triggerType: "explicit_crisis_language",
			})
		);
		await user.root.run(async (ctx) => {
			const row = await ctx.db
				.query("daily_quote_pushes")
				.withIndex("by_profile", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.unique();
			if (row) {
				await ctx.db.patch("daily_quote_pushes", row._id, { ignored: 3 });
			}
		});
		const { pushes } = await morning(user, 0);
		expect(pushes).toBe(0);
		expect(await outreachOf(user)).toMatchObject([
			{ outcome: "suppressed", suppressedReason: "escalation_active" },
		]);
		const row = await rowOf(user);
		expect(row?.ignored).toBe(3);
		expect(row?.lastOutreachId).toBeUndefined();
	});

	it("isn't held by 30 days without a session", async () => {
		const user = await subscribed();
		await user.root.run((ctx) =>
			ctx.db.patch("emotional_profiles", user.profileId, {
				lastSessionAt: dayStart(0) - 60 * DAY,
			})
		);
		expect((await morning(user, 0)).pushes).toBe(1);
	});

	it("stops for a deleted account", async () => {
		const user = await subscribed();
		await user.root.run((ctx) =>
			ctx.db.patch("users", user.userId, { accountStatus: "deleted" })
		);
		expect((await morning(user, 0)).pushes).toBe(0);
		expect(await rowOf(user)).toBeNull();
	});
});

describe("the backoff", () => {
	it("goes every other day after 5 ignored, then pauses after 10 with one last line", async () => {
		const user = await subscribed();
		const perDay: number[] = [];
		for (let n = 0; n < 17; n++) {
			perDay.push((await morning(user, n)).pushes);
		}
		// Days 0–4 daily; from day 5 every other day; the 10th ignored send
		// (day 14) settles on day 15, which pauses with its last line.
		expect(perDay).toEqual([1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0]);
		const { EVERY_OTHER_DAY_AFTER, PAUSE_AFTER } = await push();
		expect(EVERY_OTHER_DAY_AFTER).toBe(5);
		expect(PAUSE_AFTER).toBe(10);
		expect(h.pushes.at(-1)?.notification).toMatchObject({
			body: DAILY_QUOTE_COPY.paused.body,
			data: { type: "daily_quote" },
		});
		expect(h.pushes.at(-1)?.notification.data).not.toHaveProperty("screen");
		expect((await prefsOf(user)).notifications.dailyQuote).toEqual({
			enabled: false,
			pausedAt: dayStart(15) + MORNING + 5 * MINUTE,
			slot: "morning",
		});
		expect(await rowOf(user)).toBeNull();
	});

	it("counts a sent quote as ignored only once it's settled unopened", async () => {
		const user = await subscribed();
		await morning(user, 0);
		expect((await rowOf(user))?.ignored).toBe(0);
		await morning(user, 1);
		expect((await rowOf(user))?.ignored).toBe(1);
	});

	it("starts over when a quote is opened, in the app or from the push", async () => {
		const user = await subscribed();
		for (let n = 0; n < 6; n++) {
			await morning(user, n);
		}
		// Day 5 was skipped: five ignored.
		expect((await rowOf(user))?.ignored).toBe(5);

		// Opening any quote (here yesterday's, from the archive) starts it over.
		const [, , , , last] = await user.root.run((ctx) =>
			ctx.db
				.query("daily_quotes")
				.withIndex("by_profile_date", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.collect()
		);
		if (!last) {
			throw new Error("no quote");
		}
		await user.t.mutation(api.dailyQuotes.opened.markOpened, {
			quoteId: last._id,
		});
		expect((await rowOf(user))?.ignored).toBe(0);
		expect((await morning(user, 6)).pushes).toBe(1);
		expect((await morning(user, 7)).pushes).toBe(1);

		// Tapping today's push opens it: shipped builds mark the log row.
		const logId = h.pushes.at(-1)?.notification.data
			.logId as Id<"notification_log">;
		await user.t.mutation(api.notifications.markResultedInSession, { logId });
		const opened = await user.root.run((ctx) =>
			ctx.db
				.query("daily_quotes")
				.withIndex("by_profile_date", (q) =>
					q.eq("emotionalProfileId", user.profileId).eq("date", dateOf(7))
				)
				.unique()
		);
		expect(opened?.openedAt).toBeDefined();
		await morning(user, 8);
		expect((await rowOf(user))?.ignored).toBe(0);
	});

	it("a reaction counts as opening, for builds before markOpened", async () => {
		const user = await subscribed();
		const { quoteId } = await morning(user, 0);
		if (!quoteId) {
			throw new Error("no quote");
		}
		await user.t.mutation(api.dailyQuotes.react, {
			quoteId,
			reaction: "resonates",
		});
		await morning(user, 1);
		expect((await rowOf(user))?.ignored).toBe(0);
	});
});

describe("the setting", () => {
	it("turning it on makes the schedule, off removes it, and on again clears a pause", async () => {
		const user = await subscribed("evening");
		expect((await rowOf(user))?.dueAt).toBe(dayStart(0) + 19 * HOUR);

		await user.t.mutation(api.preferences.update, {
			notificationDailyQuote: { enabled: false, slot: "evening" },
		});
		expect(await rowOf(user)).toBeNull();

		await setNotifications(user, {
			dailyQuote: { enabled: false, pausedAt: 1, slot: "evening" },
		});
		await user.t.mutation(api.preferences.update, {
			notificationDailyQuote: { enabled: true, slot: "morning" },
		});
		expect((await prefsOf(user)).notifications.dailyQuote).toEqual({
			enabled: true,
			slot: "morning",
		});
		expect(await rowOf(user)).toMatchObject({
			dueAt: dayStart(0) + MORNING,
			ignored: 0,
		});
	});

	it("a new zone moves the next slot", async () => {
		const user = await subscribed();
		await user.t.mutation(api.preferences.update, {
			notificationTimezone: "Asia/Tokyo",
		});
		// 08:00 in Tokyo is 23:00Z the day before; 07:00Z now, so tomorrow's.
		expect((await rowOf(user))?.dueAt).toBe(dayStart(0) + 23 * HOUR);
	});

	it("an echo read before the backoff paused it doesn't turn it back on", async () => {
		const user = await subscribed();
		const { notifications: stale } = await prefsOf(user);
		await setNotifications(user, {
			dailyQuote: { enabled: false, pausedAt: 1, slot: "morning" },
		});
		await user.t.mutation(api.preferences.update, { notifications: stale });
		expect((await prefsOf(user)).notifications.dailyQuote).toEqual({
			enabled: false,
			pausedAt: 1,
			slot: "morning",
		});
	});

	it("turning it on from all off sends the daily quote and wakes nothing else", async () => {
		const user = await asNewUser();
		register(user);
		await settleSignup(user);
		await setNotifications(user, { timezone: "UTC" });
		const before = (await prefsOf(user)).notifications;
		await user.t.mutation(api.preferences.update, {
			notificationDailyQuote: { enabled: true, slot: "morning" },
		});
		const after = (await prefsOf(user)).notifications;
		// Every other flag as it was: the master stays off, so letters,
		// Kindling, achievements and chat (absent = on) stay asleep.
		expect({ ...after, dailyQuote: undefined }).toEqual({
			...before,
			dailyQuote: undefined,
		});
		expect(after.enabled).toBe(false);
		const { suppressionFor } = await router();
		for (const intent of ["kindling_ready", "gentle_return"] as const) {
			expect(
				await user.root.run((ctx) =>
					suppressionFor(
						ctx,
						{ emotionalProfileId: user.profileId, intent },
						Date.now()
					)
				)
			).not.toBeNull();
		}
		expect((await morning(user, 0)).pushes).toBe(1);
	});

	it("keeps sending when Settings turns gentle reminders and chat off", async () => {
		const user = await subscribed();
		await setNotifications(user, { chat: true, gentleReturn: true });
		const { notifications } = await prefsOf(user);
		// What every build's Settings writes once both are off.
		await user.t.mutation(api.preferences.update, {
			notifications: {
				...notifications,
				chat: false,
				enabled: false,
				gentleReturn: false,
			},
		});
		expect((await prefsOf(user)).notifications).toMatchObject({
			dailyQuote: { enabled: true, slot: "morning" },
			enabled: false,
		});
		expect((await morning(user, 0)).pushes).toBe(1);
	});

	it("asking for push for it alone registers the device and changes no preference", async () => {
		const user = await asNewUser();
		await settleSignup(user);
		const before = (await prefsOf(user)).notifications;
		await user.t.mutation(api.notifications.registerToken, {
			autoEnable: false,
			pushToken: "ExponentPushToken[quote]",
		});
		expect((await prefsOf(user)).notifications).toEqual(before);
		// Shipped builds keep the first-grant auto-enable.
		await user.t.mutation(api.notifications.registerToken, {
			pushToken: "ExponentPushToken[quote]",
		});
		expect((await prefsOf(user)).notifications).toMatchObject({
			chat: true,
			enabled: true,
			gentleReturn: true,
		});
	});

	it("an old client echoing its notifications back keeps the setting", async () => {
		const user = await subscribed();
		const { notifications } = await prefsOf(user);
		await user.t.mutation(api.preferences.update, {
			notifications: { ...notifications, gentleReturn: true },
		});
		expect((await prefsOf(user)).notifications.dailyQuote).toEqual({
			enabled: true,
			slot: "morning",
		});
		expect(await rowOf(user)).not.toBeNull();
	});

	it("getToday still returns a quote with openedAt set", async () => {
		const user = await subscribed();
		const quoteId = await seedQuote(user, 0);
		await user.t.mutation(api.dailyQuotes.opened.markOpened, { quoteId });
		const today = await user.t.query(api.dailyQuotes.getToday, {});
		expect(today.curated?.openedAt).toBeDefined();
	});

	it("asks for a quote to be made each night", async () => {
		const user = await subscribed();
		const status = await user.root.query(
			internal.jobs.quotesGenerator.getProfileStatus,
			{ date: dateOf(1), emotionalProfileId: user.profileId }
		);
		expect(status.active).toBe(true);
	});
});

describe("migration from the on-device reminders", () => {
	async function legacy(
		quotes: Partial<NonNullable<Doc<"preferences">["quotes"]>>
	): Promise<SeededUser> {
		const user = await asNewUser();
		await settleSignup(user);
		await setNotifications(user, { enabled: true, timezone: "UTC" });
		const prefs = await prefsOf(user);
		await user.root.run((ctx) =>
			ctx.db.patch("preferences", prefs._id, {
				quotes: {
					notificationEnabled: true,
					shownQuoteIds: [],
					themes: ["rest"],
					...quotes,
				},
			})
		);
		return user;
	}

	it("carries an opt-in over at the same slot, once", async () => {
		const user = await legacy({ notificationTime: "evening" });
		const adopted = await user.t.mutation(
			api.dailyQuotes.pushSettings.adoptLegacyReminders,
			{}
		);
		expect(adopted).toEqual({ enabled: true, slot: "evening" });
		expect(await rowOf(user)).toMatchObject({
			dueAt: dayStart(0) + 19 * HOUR,
			ignored: 0,
		});
		// Safe on every launch.
		expect(
			await user.t.mutation(
				api.dailyQuotes.pushSettings.adoptLegacyReminders,
				{}
			)
		).toEqual({ enabled: true, slot: "evening" });
	});

	it("reaches someone who had only the on-device reminders, with push off", async () => {
		const user = await legacy({ notificationTime: "morning" });
		register(user);
		await setNotifications(user, { enabled: false });
		await user.t.mutation(
			api.dailyQuotes.pushSettings.adoptLegacyReminders,
			{}
		);
		expect((await prefsOf(user)).notifications.enabled).toBe(false);
		expect((await morning(user, 0)).pushes).toBe(1);
	});

	it("leaves off whoever had them off, at no time, or never set them", async () => {
		for (const quotes of [
			{ notificationEnabled: false, notificationTime: "morning" },
			{ notificationTime: "none" },
			{ notificationTime: undefined },
		]) {
			const user = await legacy(quotes);
			expect(
				await user.t.mutation(
					api.dailyQuotes.pushSettings.adoptLegacyReminders,
					{}
				)
			).toBeNull();
			expect(await rowOf(user)).toBeNull();
		}
		const fresh = await asNewUser();
		expect(
			await fresh.t.mutation(
				api.dailyQuotes.pushSettings.adoptLegacyReminders,
				{}
			)
		).toBeNull();
	});

	it("never overrides a choice already made", async () => {
		const user = await legacy({ notificationTime: "morning" });
		await user.t.mutation(api.preferences.update, {
			notificationDailyQuote: { enabled: false, slot: "afternoon" },
		});
		expect(
			await user.t.mutation(
				api.dailyQuotes.pushSettings.adoptLegacyReminders,
				{}
			)
		).toEqual({ enabled: false, slot: "afternoon" });
		expect(await rowOf(user)).toBeNull();
	});
});

describe("Telegram", () => {
	it("takes the intent; push does too", async () => {
		const { channelTakesIntent } = await channels();
		expect(channelTakesIntent("telegram", "daily_quote")).toBe(true);
		expect(channelTakesIntent("push", "daily_quote")).toBe(true);
	});

	async function linked(plan: "free" | "plus"): Promise<SeededUser> {
		const user = await subscribed();
		h.telegram.configured = true;
		await asAdmin(9, user.root).mutation(
			api.admin.outreachChannels.setChannelConfig,
			{ channel: "telegram", enabled: true, plan }
		);
		await user.root.run((ctx) =>
			ctx.db.insert("channel_identities", {
				channel: "telegram",
				emotionalProfileId: user.profileId,
				externalId: "42",
				linkedAt: Date.now(),
				status: "active",
				tokenIdentifier: "test|42",
			})
		);
		await setNotifications(user, { channelOrder: ["telegram", "push"] });
		return user;
	}

	it("reaches a linked person there when the channel is open to them", async () => {
		const user = await linked("free");
		await morning(user, 0);
		expect(h.pushes).toHaveLength(0);
		expect(h.telegram.sends).toHaveLength(1);
		expect(h.telegram.sends[0]?.variants?.telegram?.quote).toBe(CURATED);
	});

	it("follows the channel's plan: a free person falls to push when it's Plus", async () => {
		const user = await linked("plus");
		await morning(user, 0);
		expect(h.telegram.sends).toHaveLength(0);
		expect(h.pushes).toHaveLength(1);
	});

	it("shows a curated quote as a blockquote under a general first line", async () => {
		const { dailyQuoteMessage } = await telegramAdapter();
		vi.stubEnv("CONVEX_SITE_URL", "https://example.convex.site");
		const outreach = {
			content: { body: "unused" },
			moment: { kind: "daily_quote", quoteId: "q" },
			variants: {
				telegram: { body: "Today's quote", quote: "Rest is part of it." },
			},
		} as unknown as Doc<"outreach">;
		expect(dailyQuoteMessage(outreach)).toEqual({
			entities: [{ length: 19, offset: 15, type: "blockquote" }],
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: DAILY_QUOTE_COPY.telegramButton,
							url: "https://example.convex.site/telegram/open/quotes",
						},
					],
				],
			},
			text: "Today's quote\n\nRest is part of it.",
		});
		const personal = {
			content: { body: "unused" },
			moment: { kind: "daily_quote", quoteId: "q" },
			variants: { telegram: { body: DAILY_QUOTE_COPY.personal } },
		} as unknown as Doc<"outreach">;
		expect(dailyQuoteMessage(personal)).not.toHaveProperty("entities");
		expect(dailyQuoteMessage(personal).text).toBe(DAILY_QUOTE_COPY.personal);
		vi.unstubAllEnvs();
	});
});

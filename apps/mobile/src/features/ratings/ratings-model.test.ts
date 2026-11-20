import { describe, expect, it } from "vitest";
import { LATEST_RELEASE } from "@/lib/release-notes";
import {
	RATINGS_FRESH,
	type RatingsRecord,
	type ReleaseRan,
} from "@/store/ratings-slice";
import {
	afterShowing,
	canSend,
	isHelpRoute,
	isLink,
	isPlainOpen,
	markSeen,
	type OpenInput,
	planOpen,
	RATING_RULES as R,
	withBaseline,
} from "./ratings-model";

const NOW = Date.parse("2027-01-10T12:00:00Z");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const ago = (ms: number) => NOW - ms;
const SHIPPED = Date.parse("2026-12-01T09:00:00Z");
const RAN: ReleaseRan = { at: SHIPPED, id: LATEST_RELEASE.id };

const SEEN: RatingsRecord = { ...RATINGS_FRESH, seen: [LATEST_RELEASE.id] };
const RELEASE_WAITING: RatingsRecord = {
	...RATINGS_FRESH,
	firstAsked: true,
	lightSession: true,
	seen: [],
};

const input = (
	record: Partial<RatingsRecord>,
	cardWaiting = false,
	firstRun = false
): OpenInput => ({
	cardWaiting,
	firstRun,
	now: NOW,
	record: { ...SEEN, ...record },
	release: RAN,
});

describe("planOpen: the first ask", () => {
	it("nothing before a finished lighter session", () => {
		expect(planOpen(input({}))).toMatchObject({ rate: false, whatsNew: false });
	});

	it("the rating screen alone after one", () => {
		expect(planOpen(input({ lightSession: true }))).toMatchObject({
			rate: true,
			whatsNew: false,
		});
	});

	it("only once", () => {
		expect(
			planOpen(input({ firstAsked: true, lightSession: true }))
		).toMatchObject({ rate: false, whatsNew: false });
	});
});

describe("planOpen: a release waiting", () => {
	it("What's New, then the rating screen", () => {
		expect(planOpen(input(RELEASE_WAITING))).toMatchObject({
			rate: true,
			whatsNew: true,
		});
	});

	it("What's New shows even before any session, without the rating screen's cooldowns", () => {
		expect(planOpen(input({ seen: [] }))).toMatchObject({
			rate: true,
			whatsNew: true,
		});
	});

	it.each([
		["rated 2 months ago", { ratedAt: ago(60 * DAY) }],
		["wrote a review 11 months ago", { wroteAt: ago(330 * DAY) }],
		["sent a note since the release", { noteAt: SHIPPED + HOUR }],
		["saw it 89 days ago", { shownAt: ago(89 * DAY) }],
	])("What's New only: %s", (_, record) => {
		expect(planOpen(input({ ...RELEASE_WAITING, ...record }))).toMatchObject({
			rate: false,
			whatsNew: true,
		});
	});

	it.each([
		["rated 13 months ago", { ratedAt: ago(R.ratedMs + DAY) }],
		["sent a note before the release", { noteAt: SHIPPED - HOUR }],
		["saw it 91 days ago", { shownAt: ago(91 * DAY) }],
	])("the cooldown has run out: %s", (_, record) => {
		expect(planOpen(input({ ...RELEASE_WAITING, ...record })).rate).toBe(true);
	});
});

describe("planOpen: never while hurting", () => {
	it.each([
		["much heavier 47 h ago", { heavyAt: ago(47 * HOUR) }, false],
		["a heavier follow-up still open", { heavierFollowUp: true }, true],
		["Help 6 days ago", { helpAt: ago(6 * DAY) }, false],
	])("the first ask waits: %s", (_, record, cardWaiting) => {
		expect(
			planOpen(input({ lightSession: true, ...record }, cardWaiting))
		).toMatchObject({ rate: false, whatsNew: false });
	});

	it("a card waiting from a session that didn't end heavier doesn't count", () => {
		expect(planOpen(input({ lightSession: true }, true)).rate).toBe(true);
	});

	it("a heavier follow-up the server no longer holds (answered, expired) doesn't count", () => {
		expect(
			planOpen(input({ heavierFollowUp: true, lightSession: true }, false)).rate
		).toBe(true);
	});

	it("What's New still shows, without the rating screen", () => {
		expect(
			planOpen(input({ ...RELEASE_WAITING, heavyAt: ago(HOUR) }))
		).toMatchObject({ rate: false, whatsNew: true });
	});

	it.each([
		["much heavier 49 h ago", { heavyAt: ago(49 * HOUR) }],
		["Help 8 days ago", { helpAt: ago(8 * DAY) }],
	])("asks again once the wait is over: %s", (_, record) => {
		expect(planOpen(input({ lightSession: true, ...record })).rate).toBe(true);
	});
});

describe("planOpen: the prototype's cases", () => {
	const FIRST = { lightSession: true };
	const RELEASE = RELEASE_WAITING;
	const NOTHING = { rate: false, whatsNew: false };
	const ASK = { rate: true, whatsNew: false };
	const NEW_ONLY = { rate: false, whatsNew: true };
	const NEW_THEN_ASK = { rate: true, whatsNew: true };
	const cases: [string, Partial<RatingsRecord>, boolean, boolean, object][] = [
		["the first ask", FIRST, false, false, ASK],
		[
			"much heavier 47 h ago",
			{ ...FIRST, heavyAt: ago(47 * HOUR) },
			false,
			false,
			NOTHING,
		],
		[
			"much heavier 49 h ago",
			{ ...FIRST, heavyAt: ago(49 * HOUR) },
			false,
			false,
			ASK,
		],
		[
			"a heavier follow-up open",
			{ ...FIRST, heavierFollowUp: true },
			true,
			false,
			NOTHING,
		],
		[
			"Help 6 days ago",
			{ ...FIRST, helpAt: ago(6 * DAY) },
			false,
			false,
			NOTHING,
		],
		["Help 8 days ago", { ...FIRST, helpAt: ago(8 * DAY) }, false, false, ASK],
		[
			"rated 364 days ago",
			{ ...RELEASE, ratedAt: ago(364 * DAY) },
			false,
			false,
			NEW_ONLY,
		],
		[
			"rated 366 days ago",
			{ ...RELEASE, ratedAt: ago(366 * DAY) },
			false,
			false,
			NEW_THEN_ASK,
		],
		[
			"wrote a review 364 days ago",
			{ ...RELEASE, wroteAt: ago(364 * DAY) },
			false,
			false,
			NEW_ONLY,
		],
		[
			"wrote a review 366 days ago",
			{ ...RELEASE, wroteAt: ago(366 * DAY) },
			false,
			false,
			NEW_THEN_ASK,
		],
		[
			"a note after the release shipped",
			{ ...RELEASE, noteAt: SHIPPED + HOUR },
			false,
			false,
			NEW_ONLY,
		],
		[
			"a note before it shipped",
			{ ...RELEASE, noteAt: SHIPPED - HOUR },
			false,
			false,
			NEW_THEN_ASK,
		],
		[
			"shown 89 days ago",
			{ ...RELEASE, shownAt: ago(89 * DAY) },
			false,
			false,
			NEW_ONLY,
		],
		[
			"shown 91 days ago",
			{ ...RELEASE, shownAt: ago(91 * DAY) },
			false,
			false,
			NEW_THEN_ASK,
		],
		[
			"a release waiting while hurting",
			{ ...RELEASE, heavyAt: ago(HOUR) },
			false,
			false,
			NEW_ONLY,
		],
		["first run, a release waiting", RELEASE, false, true, NOTHING],
		["first run, the first ask due", FIRST, false, true, NOTHING],
	];

	it.each(cases)("%s", (_, record, cardWaiting, firstRun, plan) => {
		expect(planOpen(input(record, cardWaiting, firstRun))).toMatchObject(plan);
	});
});

describe("withBaseline", () => {
	it("an account made after this device first ran the release has nothing new to see", () => {
		expect(withBaseline(RATINGS_FRESH, SHIPPED + DAY, RAN).seen).toEqual([
			LATEST_RELEASE.id,
		]);
	});

	it("an account from before it sees What's New", () => {
		expect(withBaseline(RATINGS_FRESH, SHIPPED - DAY, RAN).seen).toEqual([]);
	});

	it("is settled once", () => {
		const settled = { ...RATINGS_FRESH, seen: ["2026-06"] };
		expect(withBaseline(settled, SHIPPED + DAY, RAN)).toBe(settled);
	});
});

describe("afterShowing", () => {
	it("marks the release seen and the ask shown", () => {
		const plan = planOpen(input(RELEASE_WAITING));
		expect(afterShowing(RELEASE_WAITING, plan, LATEST_RELEASE.id, NOW)).toEqual(
			{ firstAsked: true, seen: [LATEST_RELEASE.id], shownAt: NOW }
		);
	});

	it("What's New only leaves the ask alone", () => {
		const record = { ...RELEASE_WAITING, ratedAt: ago(DAY) };
		const plan = planOpen(input(record));
		expect(afterShowing(record, plan, LATEST_RELEASE.id, NOW)).toEqual({
			seen: [LATEST_RELEASE.id],
		});
	});

	it("nothing shown writes nothing", () => {
		const plan = planOpen(input({}));
		expect(afterShowing(SEEN, plan, LATEST_RELEASE.id, NOW)).toEqual({});
	});
});

describe("a plain open", () => {
	const today = { blocked: false, linked: false, pathname: "/today" };

	it("lands on Today with nothing else up", () => {
		expect(isPlainOpen(today)).toBe(true);
	});

	it.each([
		["through a link or a push", { linked: true }],
		["while the greeting is due or up", { blocked: true }],
		["on another screen (a follow-up, Talk, Help)", { pathname: "/talk" }],
		["on the session end", { pathname: "/session-end" }],
	])("not %s", (_, moment) => {
		expect(isPlainOpen({ ...today, ...moment })).toBe(false);
	});

	it("the dev client's own link isn't a link", () => {
		expect(
			isLink("exp+xolace://expo-development-client/?url=http%3A%2F%2Flocalhost")
		).toBe(false);
		expect(isLink(null)).toBe(false);
		expect(isLink("xolace://dev/ratings/rate")).toBe(true);
	});

	it("knows the crisis help routes", () => {
		expect(isHelpRoute("/crisis-resources")).toBe(true);
		expect(isHelpRoute("/crisis-resources/call")).toBe(true);
		expect(isHelpRoute("/crisis")).toBe(false);
	});
});

describe("Tell us", () => {
	it("sends only words", () => {
		expect(canSend("  ")).toBe(false);
		expect(canSend(" It froze on Talk. ")).toBe(true);
	});
});

describe("markSeen", () => {
	it("adds the release once", () => {
		const seen = ["2026-06"];
		expect(markSeen(seen, "2026-12")).toEqual(["2026-06", "2026-12"]);
		expect(markSeen(null, "2026-12")).toEqual(["2026-12"]);
		expect(markSeen(seen, "2026-06")).toBe(seen);
	});
});

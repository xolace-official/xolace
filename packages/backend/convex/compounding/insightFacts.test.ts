/**
 * The raw material insights are written from (#526): code finds the facts,
 * the model only judges and writes. Failure modes: a "say vs after" pair from
 * a session with no check-in, or a domain offered on one pair; crowding out
 * flagged for a part that only went quiet because the person went quiet, or
 * one seen only a couple of times (two relief moments are not a part of life); an absence claimed on a week of evidence, or "never ended
 * lighter" when a check-in said lighter; a thread candidate whose neighbour is
 * the same domain, the seed itself, or a session that can't be cited (burned,
 * a quote reply); a crisis session's text sent as a search query; a relief
 * source that didn't end lighter.
 */
import { describe, expect, it } from "vitest";
import { type FactSession, rawMaterial } from "./insightFacts";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 9);
const when = (at: number) => `${Math.round((NOW - at) / DAY)}d ago`;

const s = (
	id: string,
	daysAgo: number,
	domains: FactSession["domains"],
	over: Partial<FactSession> = {}
): FactSession => ({
	alsoAbout: [],
	at: NOW - daysAgo * DAY,
	checkIn: null,
	domains,
	good: false,
	id,
	intensity: 6,
	moodAfter: null,
	text: `text ${id}`,
	theirWords: [],
	...over,
});

const run = (
	sessions: FactSession[],
	neighbours: Record<string, string[]> = {}
) => {
	const queried: string[] = [];
	const search = async (text: string) => {
		queried.push(text);
		return neighbours[text.replace("text ", "")] ?? [];
	};
	return rawMaterial(sessions, { now: NOW, search, when }).then((m) => ({
		...m,
		queried,
	}));
};

describe("rawMaterial", () => {
	it("pairs how a session ended with its later check-in, per domain, only with two pairs or more", async () => {
		const m = await run([
			s("w1", 40, ["work"], { checkIn: "heavier", moodAfter: "same" }),
			s("w2", 20, ["work"], { checkIn: "heavier", moodAfter: "lighter" }),
			s("w3", 10, ["work"], { moodAfter: "lighter" }),
			s("m1", 15, ["money"], { checkIn: "lighter", moodAfter: "same" }),
		]);
		expect(m.sayVsAfter).toEqual([
			{
				domain: "work",
				endedThenCheckIn: [
					{ checkIn: "heavier", ended: "same", sessionId: "w1" },
					{ checkIn: "heavier", ended: "lighter", sessionId: "w2" },
				],
				heavierAfterEndingFine: 2,
			},
		]);
	});

	it("finds a part that dropped out while another took its place, among several", async () => {
		const m = await run([
			s("l1", 100, ["love"], { alsoAbout: ["friendships"] }),
			s("l2", 90, ["love"], { alsoAbout: ["friendships"] }),
			s("w0", 95, ["work"]),
			s("l3", 80, ["love"], { alsoAbout: ["friendships"] }),
			s("w1", 60, ["work"]),
			s("w2", 40, ["work"]),
			s("w3", 20, ["work"]),
			s("h1", 5, ["health"]),
		]);
		expect(m.crowdingOut).toContainEqual({
			lastSeen: "80d ago",
			sessionsBefore: 3,
			sinceThenMostlyAbout: ["work"],
			wentQuiet: "love",
		});
		expect(m.crowdingOut).toContainEqual(
			expect.objectContaining({ lastSeen: "80d ago", wentQuiet: "friendships" })
		);
	});

	it("sees a takeover even when the space since is shared", async () => {
		const m = await run([
			...[100, 95, 90].map((d, i) => s(`l${i}`, d, ["love"])),
			...[80, 60, 40].map((d, i) => s(`w${i}`, d, ["work"])),
			...[75, 50].map((d, i) => s(`h${i}`, d, ["health"])),
			...[70, 30].map((d, i) => s(`m${i}`, d, ["money"])),
		]);
		expect(m.crowdingOut).toEqual([
			{
				lastSeen: "90d ago",
				sessionsBefore: 3,
				sinceThenMostlyAbout: ["work", "health", "money"],
				wentQuiet: "love",
			},
		]);
	});

	it("doesn't take two relief moments for a part of life that dropped out", async () => {
		const m = await run([
			s("f1", 64, ["family"], { good: true }),
			s("f2", 37, ["family"], { good: true }),
			...[30, 20, 10, 5].map((d, i) => s(`w${i}`, d, ["work"])),
		]);
		expect(m.crowdingOut).toEqual([]);
	});

	it("doesn't call it crowding out when the person went quiet, or the part barely came up", async () => {
		const m = await run([
			s("l1", 100, ["love"]),
			s("l0", 95, ["love"]),
			s("l2", 90, ["love"]),
			s("x0", 70, ["family"]),
			s("w1", 85, ["work"]),
			s("x1", 60, ["family"]),
			s("w2", 50, ["work"]),
			s("w3", 40, ["work"]),
		]);
		expect(m.crowdingOut.map((c) => c.wentQuiet)).toEqual(["love"]);
		expect(
			(
				await run([
					s("l1", 100, ["love"]),
					s("l0", 95, ["love"]),
					s("l2", 90, ["love"]),
				])
			).crowdingOut
		).toEqual([]);
	});

	it("names what never appears in a domain, given months of it", async () => {
		const work = [100, 70, 40, 10].map((d, i) =>
			s(`w${i}`, d, ["work"], { intensity: 6, moodAfter: "same" })
		);
		const m = await run([
			...work,
			s("f1", 50, ["family"], {
				good: true,
				intensity: 2,
				moodAfter: "lighter",
			}),
		]);
		expect(m.absences).toEqual([
			{
				domain: "work",
				neverAGoodOne: true,
				neverALightOne: true,
				neverEndedLighter: true,
				sessions: 4,
				since: "100d ago",
			},
		]);
	});

	it("claims no absence on thin evidence, and not one a check-in contradicts", async () => {
		const week = [7, 5, 3, 1].map((d, i) => s(`w${i}`, d, ["work"]));
		expect((await run(week)).absences).toEqual([]);
		const months = [100, 70, 40, 10].map((d, i) =>
			s(`w${i}`, d, ["work"], i === 2 ? { checkIn: "lighter" } : {})
		);
		expect((await run(months)).absences).toEqual([
			expect.objectContaining({
				domain: "work",
				neverALightOne: true,
				neverEndedLighter: false,
			}),
		]);
	});

	it("builds thread candidates from cross-domain neighbours only", async () => {
		const m = await run(
			[
				s("w1", 60, ["work"], {
					intensity: 8,
					theirWords: ["behind again", "drowning"],
				}),
				s("h1", 40, ["health"], {
					intensity: 7,
					theirWords: ["behind on sleep"],
				}),
				s("w2", 30, ["work"], { intensity: 5, theirWords: ["behind"] }),
				s("m1", 20, ["money"], {
					intensity: 7,
					theirWords: ["behind on rent"],
				}),
			],
			{ w1: ["w1", "w2", "h1", "m1", "reply:abc", "burned"] }
		);
		expect(m.threadCandidates[0]).toEqual({
			domains: ["work", "health", "money"],
			sessions: ["w1", "h1", "m1"],
			sharedWords: ["behind"],
		});
	});

	it("never sends a crisis session's text to search", async () => {
		const m = await run([
			s("c1", 30, ["work"], { intensity: 9, text: null }),
			s("w1", 20, ["work"], { intensity: 8 }),
		]);
		expect(m.queried).toEqual(["text w1"]);
	});

	it("offers relief sources only from sessions that ended lighter, with moments like them", async () => {
		const m = await run(
			[
				s("f1", 40, ["family"], {
					checkIn: "processed",
					good: true,
					intensity: 2,
					moodAfter: "lighter",
					theirWords: ["sister's wedding"],
				}),
				s("f2", 10, ["family"], {
					good: true,
					intensity: 3,
					moodAfter: "lighter",
				}),
				s("w1", 30, ["work"], { checkIn: "heavier", moodAfter: "same" }),
			],
			{ f1: ["f2", "w1"] }
		);
		expect(m.reliefSources.map((r) => r.sessionId)).toEqual(["f1", "f2"]);
		expect(m.reliefSources[0].alike).toEqual([
			{ domains: ["family"], endedLighter: true, sessionId: "f2" },
			{ domains: ["work"], endedLighter: false, sessionId: "w1" },
		]);
	});
});

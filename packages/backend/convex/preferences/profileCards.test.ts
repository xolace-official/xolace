// @vitest-environment edge-runtime
/**
 * Hidden You cards (redesign B7), set in Settings › Appearance › Profile.
 *
 * Failure modes:
 *  1. An account that never chose reads anything but "none hidden".
 *  2. A toggle is lost or doubled: hiding twice lists a card twice, showing
 *     one card shows the others too.
 *  3. Another person's choice changes.
 *  4. Signed out, it answers instead of refusing.
 *  5. An id outside the set is stored.
 */
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { expectCode } from "../test/fixtures.helpers";
import {
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

const hidden = (user: SeededUser) =>
	user.t.query(api.preferences.profileCards.getHidden, {});

const setHidden = (
	user: SeededUser,
	card: "calendar" | "rank" | "week",
	isHidden: boolean
) =>
	user.t.mutation(api.preferences.profileCards.setHidden, {
		card,
		hidden: isHidden,
	});

describe("preferences/profileCards", () => {
	it("hides nothing for an account that never chose", async () => {
		const user = await asNewUser();
		expect(await hidden(user)).toEqual([]);
		const prefs = await user.t.query(api.preferences.get, {});
		expect(prefs.hiddenProfileCards).toBeUndefined();
	});

	it("hides and shows each card, one at a time", async () => {
		const user = await asNewUser();
		await setHidden(user, "rank", true);
		await setHidden(user, "week", true);
		expect(await hidden(user)).toEqual(["rank", "week"]);

		await setHidden(user, "rank", false);
		expect(await hidden(user)).toEqual(["week"]);

		await setHidden(user, "calendar", true);
		await setHidden(user, "week", false);
		expect(await hidden(user)).toEqual(["calendar"]);
		const prefs = await user.t.query(api.preferences.get, {});
		expect(prefs.hiddenProfileCards).toEqual(["calendar"]);
	});

	it("is idempotent: hiding twice lists the card once, showing a shown card is a no-op", async () => {
		const user = await asNewUser();
		await setHidden(user, "week", true);
		await setHidden(user, "week", true);
		expect(await hidden(user)).toEqual(["week"]);

		await setHidden(user, "rank", false);
		expect(await hidden(user)).toEqual(["week"]);
	});

	it("changes only the caller's preferences", async () => {
		const a = await asNewUser(1);
		const b = await asNewUser(2, a.root);
		await setHidden(a, "calendar", true);
		expect(await hidden(a)).toEqual(["calendar"]);
		expect(await hidden(b)).toEqual([]);
	});

	it("rejects a card outside the set", async () => {
		const user = await asNewUser();
		await expect(
			user.t.mutation(api.preferences.profileCards.setHidden, {
				card: "steadiness" as never,
				hidden: true,
			})
		).rejects.toThrow();
		expect(await hidden(user)).toEqual([]);
	});

	it("refuses signed out", async () => {
		await expectCode(
			() => asUnauthed().query(api.preferences.profileCards.getHidden, {}),
			"not_authenticated"
		);
		await expectCode(
			() =>
				asUnauthed().mutation(api.preferences.profileCards.setHidden, {
					card: "rank",
					hidden: true,
				}),
			"not_authenticated"
		);
	});
});

/** Ratings on fixtures: the latest release, and taps that go nowhere. */

import { LATEST_RELEASE } from "../copy";
import type { Rate } from "../rate-data";
import type { TellUs } from "../tell-us-data";
import type { WhatsNew } from "../whats-new-data";

const ignore = () => undefined;

export const WHATS_NEW_FIXTURE: WhatsNew = {
	actions: { continue: ignore },
	state: { entry: LATEST_RELEASE },
};

export const rateFixture = (rated: boolean): Rate => ({
	actions: { close: ignore, rate: ignore, tellUs: ignore, write: ignore },
	state: { rated },
});

export const TELL_US_NOTE = "The chat froze when I came back to it.";

export const tellUsFixture = (
	state: Partial<TellUs["state"]> = {}
): TellUs => ({
	actions: { close: ignore, send: ignore, setText: ignore },
	state: { limited: false, sending: false, sent: false, text: "", ...state },
});

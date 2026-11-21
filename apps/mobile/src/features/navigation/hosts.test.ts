import { describe, expect, it, vi } from "vitest";
import { ROOT_HOSTS } from "@/features/navigation/hosts";

vi.mock("@/features/achievements/arrival/arrivals-host", () => ({
	ArrivalsHost: () => null,
}));
vi.mock("@/features/player/now-playing/now-playing-host", () => ({
	NowPlayingHost: () => null,
}));
vi.mock("@/features/feedback/shake/feedback-shake", () => ({
	FeedbackShake: () => null,
}));
vi.mock("@/features/connect/age-gate/age-ask-host", () => ({
	AgeAskHost: () => null,
}));
vi.mock("@/features/letters/late-risk-host", () => ({
	LateRiskHost: () => null,
}));
vi.mock("@/features/quotes/reminders/reminder-handover-host", () => ({
	ReminderHandoverHost: () => null,
}));
vi.mock("@/features/ratings/open-ask-host", () => ({
	OpenAskHost: () => null,
}));
vi.mock("@/features/launch/launch-store", () => ({
	useLaunch: { getState: () => ({ phase: "cover" }) },
	useLaunchRevealed: () => false,
}));

describe("ROOT_HOSTS", () => {
	it("names each host once, since the name is its key", () => {
		const names = ROOT_HOSTS.map((host) => host.name);
		expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([]);
	});
});

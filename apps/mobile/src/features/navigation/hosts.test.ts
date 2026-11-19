import { describe, expect, it, vi } from "vitest";
import { ROOT_HOSTS } from "@/features/navigation/hosts";

// The hosts are React Native trees, which node can't load; only their entries are under test.
vi.mock("@/features/achievements/arrival/arrivals-host", () => ({
	ArrivalsHost: () => null,
}));
vi.mock("@/features/player/now-playing/now-playing-host", () => ({
	NowPlayingHost: () => null,
}));
vi.mock("@/features/connect/age-gate/age-ask-host", () => ({
	AgeAskHost: () => null,
}));
vi.mock("@/features/letters/late-risk-host", () => ({
	LateRiskHost: () => null,
}));

describe("ROOT_HOSTS", () => {
	it("names each host once, since the name is its key", () => {
		const names = ROOT_HOSTS.map((host) => host.name);
		expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([]);
	});
});

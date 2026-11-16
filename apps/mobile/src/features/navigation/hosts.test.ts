import { describe, expect, it } from "vitest";
import { hostsFor, type ShellHost } from "@/features/navigation/hosts";

const Nothing = () => null;

describe("hostsFor", () => {
	const ARRIVALS: ShellHost = { Host: Nothing, name: "arrivals", shell: "v2" };
	const BADGE_UNLOCK: ShellHost = {
		Host: Nothing,
		name: "badge-unlock",
		shell: "v1",
	};

	it("mounts each host only in its own shell", () => {
		expect(hostsFor("v2", [BADGE_UNLOCK, ARRIVALS])).toEqual([ARRIVALS]);
		expect(hostsFor("v1", [BADGE_UNLOCK, ARRIVALS])).toEqual([BADGE_UNLOCK]);
	});

	it("names each registered host once, since the name is its key", () => {
		const names = [...hostsFor("v1"), ...hostsFor("v2")].map((h) => h.name);
		expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([]);
	});
});

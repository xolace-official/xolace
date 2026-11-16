import { describe, expect, it } from "vitest";
import { ROOT_HOSTS } from "@/features/navigation/hosts";

describe("ROOT_HOSTS", () => {
	it("names each host once, since the name is its key", () => {
		const names = ROOT_HOSTS.map((host) => host.name);
		expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([]);
	});
});

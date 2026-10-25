import { describe, expect, test } from "bun:test";

import {
	BASE_PORTS,
	definesConvexDeployment,
	envFileCandidates,
	fnv1a,
	PORT_SLOTS,
	parseMainWorktree,
	planEnvLinks,
	portSlotFor,
	portsForSlot,
} from "./setup-worktree";

const WORKTREE = "/repos/xolace/.claude/worktrees/agent-abc";

describe("port slots", () => {
	test("fnv1a matches the reference vectors", () => {
		expect(fnv1a("")).toBe(0x81_1c_9d_c5);
		expect(fnv1a("a")).toBe(0xe4_0c_29_2c);
		expect(fnv1a("foobar")).toBe(0xbf_9c_f9_68);
	});

	test("the main worktree keeps the default ports", () => {
		expect(portSlotFor(WORKTREE, true)).toBe(0);
		expect(portsForSlot(0)).toEqual({ ...BASE_PORTS });
	});

	test("a worktree's slot is stable and inside 1..PORT_SLOTS", () => {
		const slot = portSlotFor(WORKTREE, false);
		expect(portSlotFor(WORKTREE, false)).toBe(slot);
		expect(slot).toBeGreaterThanOrEqual(1);
		expect(slot).toBeLessThanOrEqual(PORT_SLOTS);
	});

	test("different paths usually land on different slots", () => {
		const slots = new Set(
			Array.from({ length: 20 }, (_, i) => portSlotFor(`/wt/agent-${i}`, false))
		);
		expect(slots.size).toBeGreaterThan(10);
	});

	test("ports never collide across slots or with another app's range", () => {
		const seen = new Map<number, string>();
		for (let slot = 0; slot <= PORT_SLOTS; slot += 1) {
			for (const [name, port] of Object.entries(portsForSlot(slot))) {
				expect(seen.get(port)).toBeUndefined();
				seen.set(port, `${name}@${slot}`);
			}
		}
		const { web } = portsForSlot(PORT_SLOTS);
		expect(web).toBeLessThan(BASE_PORTS.docs);
	});
});

describe("env file discovery", () => {
	test("covers the root and every package directory", () => {
		expect(envFileCandidates(["apps/web", "packages/backend"])).toEqual([
			".env",
			".env.local",
			"apps/web/.env",
			"apps/web/.env.local",
			"packages/backend/.env",
			"packages/backend/.env.local",
		]);
	});

	test("links files missing here, skips present and Convex-pinning ones", () => {
		const inMain = new Set([
			"apps/web/.env",
			"apps/mobile/.env",
			"packages/backend/.env.local",
		]);
		const inWorktree = new Set(["apps/mobile/.env"]);
		const plan = planEnvLinks(
			envFileCandidates(["apps/mobile", "apps/web", "packages/backend"]),
			{
				definesConvexDeployment: (file) => file.startsWith("packages/backend"),
				inMain: (file) => inMain.has(file),
				inWorktree: (file) => inWorktree.has(file),
				isConvexCliFile: () => false,
			}
		);
		expect(plan.map(({ action, file }) => `${action} ${file}`)).toEqual([
			"skip apps/mobile/.env",
			"link apps/web/.env",
			"skip packages/backend/.env.local",
		]);
	});

	test("never links the env file the Convex CLI writes, even without a deployment yet", () => {
		const plan = planEnvLinks(["packages/backend/.env.local"], {
			definesConvexDeployment: () => false,
			inMain: () => true,
			inWorktree: () => false,
			isConvexCliFile: (file) => file === "packages/backend/.env.local",
		});
		expect(plan).toHaveLength(1);
		expect(plan[0]?.action).toBe("skip");
	});

	test("detects a CONVEX_DEPLOYMENT assignment, not a mention", () => {
		expect(definesConvexDeployment("CONVEX_DEPLOYMENT=dev:foo-123\n")).toBe(
			true
		);
		expect(
			definesConvexDeployment("# x\nexport CONVEX_DEPLOYMENT = dev:foo\n")
		).toBe(true);
		expect(definesConvexDeployment("CONVEX_URL=https://x.convex.cloud\n")).toBe(
			false
		);
		expect(
			definesConvexDeployment("NEXT_PUBLIC_CONVEX_DEPLOYMENT_NOTE=1\n")
		).toBe(false);
	});

	test("the first porcelain entry is the main worktree", () => {
		const porcelain = [
			"worktree /repos/xolace",
			"HEAD abc",
			"branch refs/heads/main",
			"",
			`worktree ${WORKTREE}`,
			"HEAD abc",
		].join("\n");
		expect(parseMainWorktree(porcelain)).toBe("/repos/xolace");
		expect(parseMainWorktree("")).toBeUndefined();
	});
});

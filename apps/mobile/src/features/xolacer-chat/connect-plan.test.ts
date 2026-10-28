import { describe, expect, it } from "vitest";
import {
	type ConnectPlanInput,
	connectPlan,
} from "@/features/xolacer-chat/connect-plan";

const ME = "user_me";
const OTHER = "user_other";
const MINE = { clerkUserId: ME };

const fresh: ConnectPlanInput = {
	cachedCredential: null,
	cachedEnabled: false,
	clerkUserId: ME,
	liveStatus: undefined,
};

describe("connectPlan", () => {
	const cases: {
		label: string;
		input: Partial<ConnectPlanInput>;
		expected: ReturnType<typeof connectPlan>;
	}[] = [
		{
			expected: { activateNow: false, clearCredential: false, resetDb: false },
			input: {},
			label:
				"fresh install: nothing cached, nothing known — wait for a surface to ask",
		},
		{
			expected: { activateNow: true, clearCredential: false, resetDb: false },
			input: { cachedCredential: MINE, cachedEnabled: true },
			label:
				"returning chat user: cached enabled + own credential → connect on cold start",
		},
		{
			expected: { activateNow: false, clearCredential: false, resetDb: false },
			input: { cachedEnabled: true },
			label:
				"cached enabled but no credential: no round trip to skip, so no eager connect",
		},
		{
			expected: { activateNow: false, clearCredential: false, resetDb: false },
			input: { cachedCredential: MINE, cachedEnabled: true, liveStatus: false },
			label:
				"kill switch flipped: cached true, live false → no connect, credential kept",
		},
		{
			expected: { activateNow: true, clearCredential: false, resetDb: false },
			input: { liveStatus: true },
			label: "live enabled resolves for a first-time chat user → connect",
		},
		{
			expected: { activateNow: false, clearCredential: true, resetDb: true },
			input: { cachedCredential: { clerkUserId: OTHER }, cachedEnabled: true },
			label:
				"Clerk user changed: wipe the other account off the device, no connect yet",
		},
		{
			expected: { activateNow: false, clearCredential: true, resetDb: true },
			input: { cachedCredential: MINE, cachedEnabled: true, clerkUserId: null },
			label: "sign-out: user gone → wipe",
		},
		{
			expected: { activateNow: false, clearCredential: false, resetDb: false },
			input: { clerkUserId: null },
			label:
				"sign-out with nothing cached: nothing to wipe, no sqlite touched for a non-chat user",
		},
	];

	for (const c of cases) {
		it(c.label, () => {
			expect(connectPlan({ ...fresh, ...c.input })).toEqual(c.expected);
		});
	}
});

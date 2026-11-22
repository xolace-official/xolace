import { act, cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ChannelConfig, ChannelSetting } from "./types";

const CONFIGS: ChannelConfig[] = [
	{ channel: "push", enabled: true, plan: "free" },
	{ channel: "telegram", enabled: false, plan: "free" },
	{ channel: "email", enabled: false, plan: "free" },
];

/** Each `setChannelConfig` call, held open until the test settles it. */
const writes: {
	args: ChannelSetting & { channel: string };
	done: () => void;
}[] = [];

vi.mock("convex/react", () => ({
	useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
	useMutation: () => (args: ChannelSetting & { channel: string }) =>
		new Promise<null>((resolve) => {
			writes.push({ args, done: () => resolve(null) });
		}),
	useQuery: () => CONFIGS,
}));

const { OutreachChannelsScreen } = await import("./outreach-channels-screen");

afterEach(() => {
	cleanup();
	writes.length = 0;
});

const locked = (name: string) =>
	screen
		.getByRole("combobox", { name: `${name} is open to` })
		.hasAttribute("data-disabled");

async function choosePlan(
	user: ReturnType<typeof userEvent.setup>,
	name: string,
	plan: string
) {
	await user.click(
		screen.getByRole("combobox", { name: `${name} is open to` })
	);
	await user.click(await screen.findByRole("option", { name: plan }));
}

describe("OutreachChannelsScreen", () => {
	it("keeps a row locked while its own write is in flight, whatever other rows finish", async () => {
		const user = userEvent.setup();
		render(<OutreachChannelsScreen />);

		await choosePlan(user, "Email", "Plus only");
		await choosePlan(user, "Push", "Plus only");
		expect(writes.map((w) => w.args.channel)).toEqual(["email", "push"]);
		expect(locked("Email")).toBe(true);
		expect(locked("Push")).toBe(true);

		// Push lands first: Email's write is still pending, so Email stays locked
		// and can't send a whole row built on its old plan.
		await act(async () => writes[1]?.done());
		expect(locked("Push")).toBe(false);
		expect(locked("Email")).toBe(true);

		await act(async () => writes[0]?.done());
		expect(locked("Email")).toBe(false);
	});
});

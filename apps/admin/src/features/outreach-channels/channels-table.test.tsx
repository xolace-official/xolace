import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChannelsTable } from "./channels-table";
import type { ChannelConfig } from "./types";

const CONFIGS: ChannelConfig[] = [
	{ channel: "push", enabled: true, plan: "free" },
	{ channel: "telegram", enabled: false, plan: "plus" },
	{
		channel: "email",
		enabled: false,
		notReachable: { complained: 3, unreachable: 1000 },
		plan: "free",
		updatedAt: Date.UTC(2026, 10, 20, 9, 30),
	},
];

function setup() {
	const onSet = vi.fn();
	render(<ChannelsTable configs={CONFIGS} onSet={onSet} />);
	return { onSet, user: userEvent.setup() };
}

afterEach(cleanup);

describe("ChannelsTable", () => {
	it("lists every channel with when it last changed", () => {
		setup();
		const rows = screen.getAllByRole("row").slice(1);
		expect(
			rows.map((row) => within(row).getAllByRole("cell")[0]?.textContent)
		).toEqual([
			expect.stringContaining("Push"),
			expect.stringContaining("Telegram"),
			expect.stringContaining("Email"),
		]);
		expect(rows[0]?.textContent).toContain("Never (coded default)");
		expect(rows[2]?.textContent).toContain("20 Nov 2026");
	});

	it("shows email's not-reachable counts, 1,000+ at the cap", () => {
		setup();
		const [, , , email] = screen.getAllByRole("row");
		expect(email?.textContent).toContain("1,000+ hard-bounced");
		expect(email?.textContent).toContain("3 marked it spam");
	});

	it("asks before turning email on, and warns about real inboxes and earlier sign-ups", async () => {
		const { onSet, user } = setup();
		await user.click(screen.getByRole("switch", { name: "Email outreach" }));

		const dialog = await screen.findByRole("alertdialog");
		expect(within(dialog).getByText("Turn on Email?")).toBeTruthy();
		expect(dialog.textContent).toContain("EMAIL_TEST_MODE is false");
		expect(dialog.textContent).toContain(
			"People who signed up while email was off never get a welcome"
		);
		expect(onSet).not.toHaveBeenCalled();

		await user.click(within(dialog).getByRole("button", { name: "Turn on" }));
		expect(onSet).toHaveBeenCalledExactlyOnceWith("email", {
			enabled: true,
			plan: "free",
		});
	});

	it("writes nothing when the confirmation is cancelled", async () => {
		const { onSet, user } = setup();
		const toggle = screen.getByRole("switch", { name: "Telegram outreach" });
		await user.click(toggle);

		const dialog = await screen.findByRole("alertdialog");
		await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

		expect(onSet).not.toHaveBeenCalled();
		expect(toggle.getAttribute("aria-checked")).toBe("false");
	});

	it("says queued deliveries still go before turning a channel off", async () => {
		const { onSet, user } = setup();
		await user.click(screen.getByRole("switch", { name: "Push outreach" }));

		const dialog = await screen.findByRole("alertdialog");
		expect(within(dialog).getByText("Turn off Push?")).toBeTruthy();
		expect(dialog.textContent).toContain("stops going to Push at once");
		expect(dialog.textContent).toContain("Deliveries already queued still go");

		await user.click(within(dialog).getByRole("button", { name: "Turn off" }));
		expect(onSet).toHaveBeenCalledExactlyOnceWith("push", {
			enabled: false,
			plan: "free",
		});
	});

	it("keeps the channel's plan when it's toggled", async () => {
		const { onSet, user } = setup();
		await user.click(screen.getByRole("switch", { name: "Telegram outreach" }));
		const dialog = await screen.findByRole("alertdialog");
		expect(dialog.textContent).toContain("open to Plus members only");

		await user.click(within(dialog).getByRole("button", { name: "Turn on" }));
		expect(onSet).toHaveBeenCalledExactlyOnceWith("telegram", {
			enabled: true,
			plan: "plus",
		});
	});
});

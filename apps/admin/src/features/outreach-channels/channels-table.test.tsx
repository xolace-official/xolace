import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChannelsTable } from "./channels-table";
import type { Channel, ChannelConfig } from "./types";

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

function setup(busy: ReadonlySet<Channel> = new Set()) {
	const onSet = vi.fn();
	render(<ChannelsTable busy={busy} configs={CONFIGS} onSet={onSet} />);
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

	it("asks before turning email on, and says who gets a welcome and when it's a real inbox", async () => {
		const { onSet, user } = setup();
		await user.click(screen.getByRole("switch", { name: "Email outreach" }));

		const dialog = await screen.findByRole("alertdialog");
		expect(within(dialog).getByText("Turn on Email?")).toBeTruthy();
		expect(dialog.textContent).toContain("EMAIL_TEST_MODE is false");
		expect(dialog.textContent).toContain(
			"anyone who signed up in the last half hour still gets one"
		);
		expect(dialog.textContent).toContain(
			"people whose welcome came due while email was off never do"
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

	it("says what moves, what's dropped and what still goes before turning push off", async () => {
		const { onSet, user } = setup();
		await user.click(screen.getByRole("switch", { name: "Push outreach" }));

		const dialog = await screen.findByRole("alertdialog");
		expect(within(dialog).getByText("Turn off Push?")).toBeTruthy();
		expect(dialog.textContent).toContain("stops going to Push at once");
		expect(dialog.textContent).toContain("otherwise it isn't sent");
		expect(dialog.textContent).toContain("they move or are dropped too");
		expect(dialog.textContent).toContain("other queued deliveries still go");

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

	it("says nothing else carries the welcome before turning email off", async () => {
		const user = userEvent.setup();
		render(
			<ChannelsTable
				busy={new Set()}
				configs={[{ channel: "email", enabled: true, plan: "free" }]}
				onSet={vi.fn()}
			/>
		);
		await user.click(screen.getByRole("switch", { name: "Email outreach" }));

		const dialog = await screen.findByRole("alertdialog");
		expect(dialog.textContent).toContain("no other channel carries them");
		expect(dialog.textContent).toContain("Emails already queued still go");
		expect(dialog.textContent).not.toContain("quiet hours");
	});

	it("writes a plan change at once, without asking, keeping the switch", async () => {
		const { onSet, user } = setup();
		await user.click(
			screen.getByRole("combobox", { name: "Telegram is open to" })
		);
		await user.click(await screen.findByRole("option", { name: "Everyone" }));

		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(onSet).toHaveBeenCalledExactlyOnceWith("telegram", {
			enabled: false,
			plan: "free",
		});
	});

	it("keeps a channel on when its plan narrows to Plus", async () => {
		const { onSet, user } = setup();
		await user.click(screen.getByRole("combobox", { name: "Push is open to" }));
		await user.click(await screen.findByRole("option", { name: "Plus only" }));

		expect(onSet).toHaveBeenCalledExactlyOnceWith("push", {
			enabled: true,
			plan: "plus",
		});
	});

	it("locks only the rows whose write is in flight", () => {
		setup(new Set<Channel>(["email", "push"]));
		const locked = (name: string) =>
			screen.getByRole("switch", { name }).hasAttribute("data-disabled");

		expect(locked("Email outreach")).toBe(true);
		expect(locked("Push outreach")).toBe(true);
		expect(locked("Telegram outreach")).toBe(false);
		expect(
			screen
				.getByRole("combobox", { name: "Email is open to" })
				.hasAttribute("data-disabled")
		).toBe(true);
	});
});

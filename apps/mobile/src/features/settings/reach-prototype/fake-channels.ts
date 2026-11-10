/**
 * PROTOTYPE (#733) — throwaway, lives only on branch prototype/reach-me-on-screen.
 * Stub channel state for the "Reach me on…" variants. No backend calls.
 */
import { useState } from "react";

export type ChannelId = "telegram" | "push";
export type LinkStep = "idle" | "disclose" | "waiting";
export type FakeState =
	| "unlinked"
	| "linked"
	| "paused"
	| "needs_plus"
	| "blocked"
	| "stopped"
	| "relinked";

export const FAKE_STATES: FakeState[] = [
	"unlinked",
	"linked",
	"paused",
	"needs_plus",
	"blocked",
	"stopped",
	"relinked",
];

export type TelegramStatus =
	| { kind: "unlinked" }
	| { kind: "linked"; handle: string; paused: boolean }
	| { kind: "needs_plus"; handle: string }
	| { kind: "disconnected"; reason: "blocked" | "user_telegram" | "relinked" };

function initialTelegram(state: FakeState): TelegramStatus {
	switch (state) {
		case "linked":
			return { handle: "@nathan", kind: "linked", paused: false };
		case "paused":
			return { handle: "@nathan", kind: "linked", paused: true };
		case "needs_plus":
			return { handle: "@nathan", kind: "needs_plus" };
		case "blocked":
			return { kind: "disconnected", reason: "blocked" };
		case "stopped":
			return { kind: "disconnected", reason: "user_telegram" };
		case "relinked":
			return { kind: "disconnected", reason: "relinked" };
		default:
			return { kind: "unlinked" };
	}
}

export const DISCONNECTED_COPY: Record<
	"blocked" | "user_telegram" | "relinked",
	string
> = {
	blocked: "Telegram disconnected: the bot was blocked.",
	relinked: "Telegram disconnected: this chat was linked to another account.",
	user_telegram: "Telegram disconnected: you sent /stop.",
};

export const LINK_DISCLOSURE = [
	"Check-ins arrive as a Telegram message you can answer with a tap or by writing back.",
	"Linking turns on check-ins.",
	"Telegram shows previews on your lock screen, so the first line of every message stays general.",
	"Chat messages from people stay on notifications.",
];

export function useFakeChannels(state: FakeState) {
	const [telegram, setTelegram] = useState<TelegramStatus>(() =>
		initialTelegram(state)
	);
	const [order, setOrder] = useState<ChannelId[]>(
		state === "unlinked" ? ["push", "telegram"] : ["telegram", "push"]
	);
	const [linkStep, setLinkStep] = useState<LinkStep>("idle");
	const [notice, setNotice] = useState<string | null>(null);

	const flash = (text: string) => {
		setNotice(text);
		setTimeout(() => setNotice(null), 1800);
	};

	return {
		completeLink: () => {
			setTelegram({ handle: "@nathan", kind: "linked", paused: false });
			setOrder(["telegram", "push"]);
			setLinkStep("idle");
			flash("Linked. Check-ins will come to Telegram first.");
		},
		copyLink: () =>
			flash("Link copied (t.me/XolaceBot?start=…) · valid 15 min"),
		linkStep,
		makeFirst: (id: ChannelId) =>
			setOrder((o) => [id, ...o.filter((c) => c !== id)]),
		move: (id: ChannelId, dir: -1 | 1) =>
			setOrder((o) => {
				const i = o.indexOf(id);
				const j = i + dir;
				if (j < 0 || j >= o.length) {
					return o;
				}
				const next = [...o];
				[next[i], next[j]] = [next[j] as ChannelId, next[i] as ChannelId];
				return next;
			}),
		notice,
		openPaywall: () => flash("Would open the Xolace+ paywall"),
		openTelegram: () => {
			setLinkStep("waiting");
			flash("Would open t.me/XolaceBot?start=<token>");
		},
		order,
		setLinkStep,
		telegram,
		togglePause: () =>
			setTelegram((t) =>
				t.kind === "linked" ? { ...t, paused: !t.paused } : t
			),
		unlink: () => {
			setTelegram({ kind: "unlinked" });
			setOrder(["push", "telegram"]);
			flash("Unlinked. The bot says goodbye in Telegram.");
		},
	};
}

export type FakeChannels = ReturnType<typeof useFakeChannels>;

/** One-line status for a channel, shared wording across variants. */
export function telegramSubtitle(t: TelegramStatus): string {
	switch (t.kind) {
		case "unlinked":
			return "Not linked";
		case "linked":
			return t.paused ? `Paused · ${t.handle}` : `Linked · ${t.handle}`;
		case "needs_plus":
			return "Paused · now part of Xolace+";
		default:
			return DISCONNECTED_COPY[t.reason];
	}
}

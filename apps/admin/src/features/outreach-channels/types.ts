import type { api } from "@xolace/backend/api";
import type { FunctionArgs } from "convex/server";

// The admin's view of `outreach_channels` (`api.admin.outreachChannels`): each
// channel's kill switch and plan, read by `outreach.enqueue` on every call.
// A channel without a row runs on its coded default (email and Telegram off).

type SetArgs = FunctionArgs<typeof api.admin.outreachChannels.setChannelConfig>;
export type Channel = SetArgs["channel"];
export type ChannelPlan = SetArgs["plan"];

/** Email only: people it can't reach, each counted up to {@link NOT_REACHABLE_CAP}. */
export interface NotReachable {
	complained: number;
	unreachable: number;
}

/**
 * One row of `listChannelConfigs`, as its `returns` validator declares it
 * (the inferred type is the handler's narrower union).
 */
export interface ChannelConfig {
	channel: Channel;
	enabled: boolean;
	notReachable?: NotReachable;
	plan: ChannelPlan;
	updatedAt?: number;
}

/** What `setChannelConfig` takes besides the channel: the whole row, always. */
export interface ChannelSetting {
	enabled: boolean;
	plan: ChannelPlan;
}

/**
 * Push and Telegram on turning off: what moves (`router.ts`) and what a
 * queued delivery does (`deliver.ts`: a quiet-hours deferral checks the
 * channel again on its first try, then falls back once or is dropped).
 */
const turnOffRerouted = (title: string) =>
	`New outreach stops going to ${title} at once. Where another channel the person has can carry it, it goes there; otherwise it isn't sent. Messages still waiting out someone's quiet hours check again before sending, so they move or are dropped too; other queued deliveries still go. Nobody is unlinked.`;

export const CHANNEL_COPY: Record<
	Channel,
	{ description: string; title: string; turnOff: string; turnOn: string }
> = {
	// Email carries only the welcome, checked when it comes due and never
	// deferred: `outreach/welcome.ts`, `channels.ts`, `email/config.ts`.
	email: {
		description:
			"The welcome, about 30 minutes after sign-up. Signing up links it.",
		title: "Email",
		turnOff:
			"New welcomes stop at once, and no other channel carries them: a welcome that comes due while email is off is never sent. Emails already queued still go. Nobody is unlinked.",
		turnOn:
			"Welcomes go out by email again. Each one checks the switch when it comes due, about 30 minutes after sign-up, so anyone who signed up in the last half hour still gets one; people whose welcome came due while email was off never do. If this deployment's EMAIL_TEST_MODE is false, that means real people's inboxes; in test mode every email goes to Resend's test address instead.",
	},
	push: {
		description: "Notifications on the phones where people allowed them.",
		title: "Push",
		turnOff: turnOffRerouted("Push"),
		turnOn:
			"Outreach routed to push goes to people's phones again, starting with the next message Xolace queues.",
	},
	telegram: {
		description: "Messages from the Xolace bot to people who linked Telegram.",
		title: "Telegram",
		turnOff: turnOffRerouted("Telegram"),
		turnOn:
			"People who linked Telegram start getting outreach from the Xolace bot, starting with the next message Xolace queues.",
	},
};

export const PLAN_LABEL: Record<ChannelPlan, string> = {
	free: "Everyone",
	plus: "Plus only",
};

export const PLAN_SCOPE: Record<ChannelPlan, string> = {
	free: "It's open to everyone, free and Plus.",
	plus: "It's open to Plus members only.",
};

/** `listChannelConfigs` counts each email state up to this many people. */
export const NOT_REACHABLE_CAP = 1000;

const COUNT = new Intl.NumberFormat("en-US");

/** 12 → "12"; the cap (or past it) → "1,000+", since the count stops there. */
export function formatReachCount(count: number) {
	return count >= NOT_REACHABLE_CAP
		? `${COUNT.format(NOT_REACHABLE_CAP)}+`
		: COUNT.format(count);
}

const CHANGED_AT = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	month: "short",
	timeZone: "UTC",
	timeZoneName: "short",
	year: "numeric",
});

/** Fixed locale and zone so server and client render the same string. */
export function formatChangedAt(ms: number) {
	return CHANGED_AT.format(ms);
}

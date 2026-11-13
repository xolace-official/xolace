import { Workpool } from "@convex-dev/workpool";
import { components } from "../_generated/api";

/** Push sends are one Expo call each; this many at once is plenty. */
const PUSH_PARALLELISM = 10;

/**
 * Every outreach workpool: one per channel for deliveries (#760), so a slow
 * or rate-limited provider never holds up another channel's, plus Telegram's
 * inbound pool. Telegram's delivery pool lands with its adapter.
 */
export const outreachPushPool = new Workpool(components.outreachPush, {
	maxParallelism: PUSH_PARALLELISM,
});

/**
 * Telegram updates (#765), one at a time so one chat's updates are handled
 * in the order they arrived. Shard by chat if replies ever back up behind it.
 */
export const telegramInboundPool = new Workpool(components.telegramInbound, {
	maxParallelism: 1,
	retryActionsByDefault: true,
});

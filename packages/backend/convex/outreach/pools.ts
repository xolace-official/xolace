import { Workpool } from "@convex-dev/workpool";
import { components } from "../_generated/api";

/** Push sends are one Expo call each; this many at once is plenty. */
const PUSH_PARALLELISM = 10;

/** Telegram allows about 30 sends a second per bot; stay well under it. */
const TELEGRAM_PARALLELISM = 5;

/**
 * Each email send looks its address up in Clerk first (ADR 0004): few at
 * once, so a large send stays well under Clerk's Backend API rate limit.
 */
const EMAIL_PARALLELISM = 3;

/**
 * Every outreach workpool: one per channel for deliveries (#760), so a slow
 * or rate-limited provider never holds up another channel's, plus Telegram's
 * inbound pool.
 */
export const outreachPushPool = new Workpool(components.outreachPush, {
	maxParallelism: PUSH_PARALLELISM,
});

/**
 * Telegram check-ins (#768). No workpool retries: the delivery runner retries
 * on Telegram's `retry_after` itself.
 */
export const outreachTelegramPool = new Workpool(components.outreachTelegram, {
	maxParallelism: TELEGRAM_PARALLELISM,
});

/**
 * Email (#914). No workpool retries: the delivery runner retries itself, and
 * the Resend component retries Resend's own 429s and 5xx behind its
 * idempotency key.
 */
export const outreachEmailPool = new Workpool(components.outreachEmail, {
	maxParallelism: EMAIL_PARALLELISM,
});

/**
 * Telegram updates (#765), one at a time so one chat's updates are claimed
 * in the order they arrived. Only the claim and its Bot API calls hold the
 * slot: an AI reply (screening, the model) is scheduled off the pool.
 */
export const telegramInboundPool = new Workpool(components.telegramInbound, {
	maxParallelism: 1,
	retryActionsByDefault: true,
});

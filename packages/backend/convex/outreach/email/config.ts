/**
 * The email channel's per-deployment settings (#914), read from the
 * deployment env at call time. Setup: docs/setup/email.md.
 *
 * - Test mode is on unless `EMAIL_TEST_MODE` is `false`, so a dev, preview or
 *   e2e deployment that sets nothing can't email anyone. Staging and prod
 *   turn it off.
 * - `EMAIL_ALLOWLIST` (staging): only these addresses are emailed.
 */

/** Used when `EMAIL_FROM` is unset. */
const DEFAULT_FROM = "Xolace <hello@notifications.xolaceinc.com>";

/** Where every test-mode email goes: Resend's own sink, never a person. */
export const TEST_MODE_RECIPIENT = "delivered@resend.dev";

/** Whether this deployment can send email at all. */
export function emailConfigured(): boolean {
	return Boolean(process.env.RESEND_API_KEY);
}

export function emailTestMode(): boolean {
	return process.env.EMAIL_TEST_MODE?.trim().toLowerCase() !== "false";
}

export function emailSender(): { from: string; replyTo: string[] } {
	const replyTo = process.env.EMAIL_REPLY_TO?.trim();
	return {
		from: process.env.EMAIL_FROM?.trim() || DEFAULT_FROM,
		replyTo: replyTo ? [replyTo] : [],
	};
}

/**
 * Whether this address may be emailed here: always, unless the deployment
 * sets an allowlist (comma-separated, case-insensitive).
 */
export function allowlisted(address: string): boolean {
	const list = process.env.EMAIL_ALLOWLIST?.split(",")
		.map((entry) => entry.trim().toLowerCase())
		.filter(Boolean);
	return !list?.length || list.includes(address.trim().toLowerCase());
}

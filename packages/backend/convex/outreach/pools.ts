import { Workpool } from "@convex-dev/workpool";
import { components } from "../_generated/api";

/** Push sends are one Expo call each; this many at once is plenty. */
const PUSH_PARALLELISM = 10;

/**
 * One workpool per channel (#760), so a slow or rate-limited provider never
 * holds up another channel's deliveries. Telegram's pool lands with its
 * adapter.
 */
export const outreachPushPool = new Workpool(components.outreachPush, {
	maxParallelism: PUSH_PARALLELISM,
});

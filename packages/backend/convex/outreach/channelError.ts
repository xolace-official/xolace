import type { ChannelErrorKind } from "./validators";

/**
 * What an adapter throws when it can't deliver: `retry` (try again after
 * `afterMs`), `permanent` (give up, fall back once) or `unreachable` (the
 * person can't be reached there; fall back once).
 *
 * Its own module so the adapters never import the registry (`adapters.ts`)
 * at runtime: that cycle left prod's email adapter undefined when the
 * registry was built.
 */
export class ChannelError extends Error {
	readonly kind: ChannelErrorKind;
	/** For `retry`: how long to wait. */
	readonly afterMs?: number;
	/** A provider code (an HTTP status, Telegram's `error_code`); never raw text. */
	readonly code?: string;

	constructor(
		kind: ChannelErrorKind,
		options: { afterMs?: number; code?: string; message?: string } = {}
	) {
		super(options.message ?? `Channel error: ${kind}`);
		this.name = "ChannelError";
		this.kind = kind;
		this.afterMs = options.afterMs;
		this.code = options.code;
	}
}

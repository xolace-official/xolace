/** The toast's rules, pure: how long it stays, what it plays, what VoiceOver says, and the
 * channel `toast()` reaches HeroUI's manager through. Drawn by `toast.tsx`. */

export type ToastVariant = "default" | "success" | "warning" | "danger";

export type ToastOptions = {
	variant?: ToastVariant;
	/** A second, quieter line. */
	description?: string;
	/** Overrides the variant's haptic; `false` plays none. */
	haptic?: (() => void) | false;
	action?: { label: string; onPress: () => void };
};

export const TOAST_MS = { action: 5000, long: 4000, short: 2600 } as const;

/** An action needs time to reach; a second line needs time to read. */
export const toastDuration = (opts: ToastOptions): number => {
	if (opts.action) {
		return TOAST_MS.action;
	}
	return opts.description ? TOAST_MS.long : TOAST_MS.short;
};

/** What VoiceOver/TalkBack announce: the drawn words are hidden from it (HeroUI measures a copy). */
export const toastAnnouncement = (message: string, opts: ToastOptions) =>
	opts.description ? `${message}. ${opts.description}` : message;

/**
 * Silence by default: callers play their own haptic for the moment. Only a
 * refusal or a problem buzzes, with `problem` (the error notice).
 */
export function toastHaptic(
	opts: ToastOptions,
	problem: () => void
): (() => void) | null {
	if (opts.haptic !== undefined) {
		return opts.haptic || null;
	}
	const variant = opts.variant ?? "default";
	return variant === "warning" || variant === "danger" ? problem : null;
}

/**
 * Where `toast()` meets the live presenter, which only exists once the bridge
 * mounts inside HeroUI's provider. A toast sent before that waits (only the
 * latest: an older one would be stale) and shows once it does.
 */
export function createToastChannel<P>() {
	let presenter: P | null = null;
	let waiting: ((p: P) => void) | null = null;
	return {
		attach(next: P) {
			presenter = next;
			if (waiting) {
				const run = waiting;
				waiting = null;
				run(next);
			}
		},
		detach() {
			presenter = null;
		},
		send(run: (p: P) => void) {
			if (presenter) {
				run(presenter);
			} else {
				waiting = run;
			}
		},
	};
}

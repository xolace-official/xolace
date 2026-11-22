export type ToastVariant = "default" | "success" | "warning" | "danger";

export type ToastOptions = {
	variant?: ToastVariant;
	description?: string;
	haptic?: (() => void) | false;
	action?: { label: string; onPress: () => void };
};

export const TOAST_MS = { action: 5000, long: 4000, short: 2600 } as const;

export const toastDuration = (opts: ToastOptions): number => {
	if (opts.action) {
		return TOAST_MS.action;
	}
	return opts.description ? TOAST_MS.long : TOAST_MS.short;
};

export const toastAnnouncement = (message: string, opts: ToastOptions) =>
	opts.description ? `${message}. ${opts.description}` : message;

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

/**
 * The seat's sign-in, without React: the order of Clerk, Convex and the two store flags the root
 * guard reads, so it can be tested with fakes. `use-sign-in.ts` wires it to the real SDKs.
 *
 * - `seatHeld` keeps first run up for the seated moment. It is taken just before `setActive` (a
 *   signed-out person is in first run anyway) and let go when the moment ends, on a cancel or a
 *   failure, when the app goes to the background, when the seat unmounts, or after `HOLD_MS`.
 * - `accountPending` covers `setActive` → `getOrCreate`: until the user row exists every
 *   `requireAuth` query throws `user_not_found`, so the root readers skip theirs while it is set.
 *   It clears when `getOrCreate` settles, and after `HOLD_MS` at the latest, even if the seat has
 *   unmounted, so a hung mutation can't leave the app waiting on it forever.
 */
import { isCancellation } from "./sign-in-errors";

export type AuthProvider = "apple" | "google";
export type SignInOutcome = "signed-in" | "cancelled" | "failed";

/** The longest the seat holds, and the longest the root readers wait for the account. */
export const HOLD_MS = 8000;

type Cancel = () => void;

export type HoldDeps = {
	setAccountPending: (pending: boolean) => void;
	setSeatHeld: (held: boolean) => void;
	/** `setTimeout`, returning its own cancel. */
	schedule: (run: () => void, ms: number) => Cancel;
};

export type SeatHold = {
	/** Takes the seat and marks the account pending; arms both deadlines. */
	begin: () => void;
	/** `getOrCreate` settled: the root readers may subscribe. */
	accountSettled: () => void;
	/** Lets go of the seat (the moment ended, or it failed). */
	release: () => void;
	/** The app's state changed (`AppState`): going to the background lets go. */
	appState: (state: string) => void;
	/** The seat unmounted: lets go, and nothing this hold does reaches the store again. */
	dispose: () => void;
};

/** The latest sign-in, across hook instances: a deadline from an older one leaves a newer
 * attempt's `accountPending` alone. */
let latestAttempt = 0;

export function createSeatHold(deps: HoldDeps): SeatHold {
	let cancelHold: Cancel | null = null;
	let disposed = false;
	let attempt = 0;

	const clearHold = () => {
		cancelHold?.();
		cancelHold = null;
	};
	const letGo = () => {
		clearHold();
		deps.setSeatHeld(false);
	};
	const settle = (id: number) => {
		if (id !== 0 && id === latestAttempt) {
			deps.setAccountPending(false);
		}
	};

	return {
		accountSettled: () => settle(attempt),
		appState: (state) => {
			if (state === "background" && !disposed) {
				letGo();
			}
		},
		begin: () => {
			if (disposed) {
				return;
			}
			latestAttempt += 1;
			attempt = latestAttempt;
			const id = attempt;
			clearHold();
			deps.setSeatHeld(true);
			deps.setAccountPending(true);
			cancelHold = deps.schedule(letGo, HOLD_MS);
			// Not cancelled on dispose: the account can still be pending after the seat is gone.
			deps.schedule(() => settle(id), HOLD_MS);
		},
		dispose: () => {
			if (!disposed) {
				letGo();
				disposed = true;
			}
		},
		release: () => {
			if (!disposed) {
				letGo();
			}
		},
	};
}

type ClerkFlow = {
	createdSessionId?: string | null;
	setActive?: ((params: { session: string }) => Promise<void>) | null;
	signUp?: { createdUserId?: string | null } | null;
};

export type SignInDeps = {
	hold: SeatHold;
	/** Clerk's `isSignedIn`, read when the tap lands. */
	isSignedIn: () => boolean;
	signOut: () => Promise<unknown>;
	/** Apple's or Google's native sheet, through Clerk. */
	start: (provider: AuthProvider) => Promise<ClerkFlow>;
	getOrCreate: (args: {
		authProvider: AuthProvider;
		authProviderAccountId: string;
	}) => Promise<unknown>;
	signedIn: (provider: AuthProvider, isNewUser: boolean) => void;
	failed: (provider: AuthProvider, error: unknown) => void;
};

/** One tap on Apple or Google: the sheet, the session, the user row. */
export async function runSignIn(
	provider: AuthProvider,
	deps: SignInDeps
): Promise<SignInOutcome> {
	try {
		// A stale Clerk session (never validated by Convex) makes the SSO flow throw
		// "You're already signed in". Clear it first.
		if (deps.isSignedIn()) {
			await deps.signOut();
		}
		const { createdSessionId, setActive, signUp } = await deps.start(provider);
		if (!(createdSessionId && setActive)) {
			return "cancelled";
		}
		deps.hold.begin();
		await setActive({ session: createdSessionId });
		try {
			await deps.getOrCreate({
				authProvider: provider,
				authProviderAccountId: signUp?.createdUserId ?? `${provider}-user`,
			});
		} finally {
			deps.hold.accountSettled();
		}
		deps.signedIn(provider, !!signUp?.createdUserId);
		return "signed-in";
	} catch (error: unknown) {
		deps.hold.release();
		if (isCancellation(error)) {
			return "cancelled";
		}
		deps.failed(provider, error);
		return "failed";
	}
}

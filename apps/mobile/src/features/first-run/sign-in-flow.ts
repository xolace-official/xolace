import { isCancellation } from "./sign-in-errors";

export type AuthProvider = "apple" | "google";
export type SignInOutcome = "signed-in" | "cancelled" | "failed";

export const HOLD_MS = 8000;

type Cancel = () => void;

export type HoldDeps = {
	setAccountPending: (pending: boolean) => void;
	setSeatHeld: (held: boolean) => void;
	schedule: (run: () => void, ms: number) => Cancel;
};

export type SeatHold = {
	begin: () => void;
	accountSettled: () => void;
	release: () => void;
	appState: (state: string) => void;
	dispose: () => void;
};

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
	isSignedIn: () => boolean;
	signOut: () => Promise<unknown>;
	start: (provider: AuthProvider) => Promise<ClerkFlow>;
	getOrCreate: (args: {
		authProvider: AuthProvider;
		authProviderAccountId: string;
	}) => Promise<unknown>;
	signedIn: (provider: AuthProvider, isNewUser: boolean) => void;
	failed: (provider: AuthProvider, error: unknown) => void;
};

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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	createSeatHold,
	HOLD_MS,
	runSignIn,
	type SeatHold,
	type SignInDeps,
} from "./sign-in-flow";

function fakeStore() {
	const store = {
		accountPending: false,
		log: [] as string[],
		seatHeld: false,
		setAccountPending: (v: boolean) => {
			store.accountPending = v;
			store.log.push(`accountPending=${v}`);
		},
		setSeatHeld: (v: boolean) => {
			store.seatHeld = v;
			store.log.push(`seatHeld=${v}`);
		},
	};
	return store;
}

const schedule = (run: () => void, ms: number) => {
	const id = setTimeout(run, ms);
	return () => clearTimeout(id);
};

const holdOn = (store: ReturnType<typeof fakeStore>) =>
	createSeatHold({
		schedule,
		setAccountPending: store.setAccountPending,
		setSeatHeld: store.setSeatHeld,
	});

function deps(
	store: ReturnType<typeof fakeStore>,
	hold: SeatHold,
	overrides: Partial<SignInDeps> = {}
): SignInDeps {
	return {
		failed: vi.fn(),
		getOrCreate: vi.fn(() => {
			store.log.push("getOrCreate");
			return Promise.resolve();
		}),
		hold,
		isSignedIn: () => false,
		signedIn: vi.fn(),
		signOut: vi.fn(() => Promise.resolve()),
		start: () =>
			Promise.resolve({
				createdSessionId: "sess_1",
				setActive: () => {
					store.log.push(
						`setActive(seatHeld=${store.seatHeld},accountPending=${store.accountPending})`
					);
					return Promise.resolve();
				},
				signUp: { createdUserId: "user_1" },
			}),
		...overrides,
	};
}

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

describe("runSignIn", () => {
	it("holds the seat and marks the account pending before the session lands", async () => {
		const store = fakeStore();
		const outcome = await runSignIn("apple", deps(store, holdOn(store)));
		expect(outcome).toBe("signed-in");
		expect(store.log).toEqual([
			"seatHeld=true",
			"accountPending=true",
			"setActive(seatHeld=true,accountPending=true)",
			"getOrCreate",
			"accountPending=false",
		]);
		expect(store.seatHeld).toBe(true);
	});

	it("keeps the root readers waiting while getOrCreate is slow", async () => {
		const store = fakeStore();
		let land = () => {};
		const slow = new Promise<void>((resolve) => {
			land = resolve;
		});
		const running = runSignIn(
			"google",
			deps(store, holdOn(store), { getOrCreate: () => slow })
		);
		await vi.advanceTimersByTimeAsync(HOLD_MS / 2);
		expect(store.accountPending).toBe(true);
		land();
		await running;
		expect(store.accountPending).toBe(false);
	});

	it("lets go of the seat and the account after HOLD_MS if getOrCreate never answers", async () => {
		const store = fakeStore();
		runSignIn(
			"apple",
			deps(store, holdOn(store), {
				getOrCreate: () => new Promise(() => {}),
			})
		);
		await vi.advanceTimersByTimeAsync(HOLD_MS - 1);
		expect(store.seatHeld).toBe(true);
		await vi.advanceTimersByTimeAsync(1);
		expect(store.seatHeld).toBe(false);
		expect(store.accountPending).toBe(false);
	});

	it("never holds the seat for a closed sheet", async () => {
		const store = fakeStore();
		const outcome = await runSignIn(
			"apple",
			deps(store, holdOn(store), {
				start: () => Promise.resolve({ createdSessionId: null }),
			})
		);
		expect(outcome).toBe("cancelled");
		expect(store.log).toEqual([]);
	});

	it("treats a cancellation error as a cancel, not a failure", async () => {
		const store = fakeStore();
		const d = deps(store, holdOn(store), {
			start: () => Promise.reject({ code: "ERR_REQUEST_CANCELED" }),
		});
		expect(await runSignIn("apple", d)).toBe("cancelled");
		expect(d.failed).not.toHaveBeenCalled();
	});

	it("lets go of both on a failure after the session landed", async () => {
		const store = fakeStore();
		const d = deps(store, holdOn(store), {
			getOrCreate: () => Promise.reject(new Error("offline")),
		});
		expect(await runSignIn("google", d)).toBe("failed");
		expect(store.seatHeld).toBe(false);
		expect(store.accountPending).toBe(false);
		expect(d.failed).toHaveBeenCalledOnce();
		expect(d.signedIn).not.toHaveBeenCalled();
	});

	it("signs a stale Clerk session out before the sheet", async () => {
		const store = fakeStore();
		const d = deps(store, holdOn(store), { isSignedIn: () => true });
		await runSignIn("apple", d);
		expect(d.signOut).toHaveBeenCalledOnce();
	});

	it("reports a new account to analytics", async () => {
		const store = fakeStore();
		const d = deps(store, holdOn(store));
		await runSignIn("apple", d);
		expect(d.signedIn).toHaveBeenCalledWith("apple", true);
	});
});

describe("createSeatHold", () => {
	it("lets go when the seated moment hands over, and its deadline is cleared", async () => {
		const store = fakeStore();
		const hold = holdOn(store);
		hold.begin();
		hold.release();
		expect(store.seatHeld).toBe(false);
		store.setSeatHeld(true);
		await vi.advanceTimersByTimeAsync(HOLD_MS);
		expect(store.seatHeld).toBe(true);
	});

	it("lets go when the app goes to the background, not when it goes inactive", () => {
		const store = fakeStore();
		const hold = holdOn(store);
		hold.begin();
		hold.appState("inactive");
		expect(store.seatHeld).toBe(true);
		hold.appState("background");
		expect(store.seatHeld).toBe(false);
	});

	it("lets go on unmount and clears its timer, so it can't release a later hold", async () => {
		const store = fakeStore();
		const hold = holdOn(store);
		hold.begin();
		hold.dispose();
		expect(store.seatHeld).toBe(false);
		store.setSeatHeld(true);
		await vi.advanceTimersByTimeAsync(HOLD_MS);
		expect(store.seatHeld).toBe(true);
	});

	it("does nothing once unmounted", () => {
		const store = fakeStore();
		const hold = holdOn(store);
		hold.dispose();
		store.log.length = 0;
		hold.begin();
		hold.release();
		hold.appState("background");
		expect(store.log).toEqual([]);
	});

	it("still clears a pending account after the seat unmounts", async () => {
		const store = fakeStore();
		const hold = holdOn(store);
		hold.begin();
		hold.dispose();
		expect(store.accountPending).toBe(true);
		await vi.advanceTimersByTimeAsync(HOLD_MS);
		expect(store.accountPending).toBe(false);
	});

	it("leaves a newer sign-in's pending account alone", async () => {
		const store = fakeStore();
		const first = holdOn(store);
		first.begin();
		first.dispose();
		await vi.advanceTimersByTimeAsync(HOLD_MS / 2);
		const second = holdOn(store);
		second.begin();
		await vi.advanceTimersByTimeAsync(HOLD_MS / 2);
		expect(store.accountPending).toBe(true);
		second.accountSettled();
		expect(store.accountPending).toBe(false);
	});
});

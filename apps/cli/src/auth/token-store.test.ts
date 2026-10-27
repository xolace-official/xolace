import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTokenStore, type Keyring } from "./token-store";

const ACCOUNT = "https://test.clerk.accounts.dev";
const SESSION = { idToken: "id", refreshToken: "rt" };
const OWNER_ONLY = 0o600;
const PERMISSION_BITS = 0o777;

const memoryKeyring = () => {
	const state: { value: string | null } = { value: null };
	const keyring: Keyring = {
		delete: () => {
			state.value = null;
		},
		get: () => state.value,
		set: (value) => {
			state.value = value;
		},
	};
	return { keyring, state };
};

// Linux without Secret Service: every call throws.
const missingKeyring: Keyring = {
	delete: () => {
		throw new Error("no keychain");
	},
	get: () => {
		throw new Error("no keychain");
	},
	set: () => {
		throw new Error("no keychain");
	},
};

let dir: string;
let filePath: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "xolace-cli-test-"));
	filePath = join(dir, "xolace", "credentials.json");
});

afterEach(async () => {
	await rm(dir, { force: true, recursive: true });
});

describe("createTokenStore", () => {
	test("round-trips through the keychain and writes no file", async () => {
		const { keyring } = memoryKeyring();
		const store = createTokenStore({ account: ACCOUNT, filePath, keyring });
		await store.save(SESSION);
		expect(await store.load()).toEqual(SESSION);
		await expect(stat(filePath)).rejects.toThrow();
		await store.clear();
		expect(await store.load()).toBeNull();
	});

	test("falls back to an owner-only file without a keychain", async () => {
		const store = createTokenStore({
			account: ACCOUNT,
			filePath,
			keyring: missingKeyring,
		});
		await store.save(SESSION);
		expect(await store.load()).toEqual(SESSION);
		// biome-ignore lint/suspicious/noBitwiseOperators: masking file mode bits
		expect((await stat(filePath)).mode & PERMISSION_BITS).toBe(OWNER_ONLY);
		await store.clear();
		expect(await store.load()).toBeNull();
	});

	test("keeps other issuers' sessions in the shared file", async () => {
		const devStore = createTokenStore({
			account: "dev",
			filePath,
			keyring: missingKeyring,
		});
		const prodStore = createTokenStore({
			account: "prod",
			filePath,
			keyring: missingKeyring,
		});
		await devStore.save(SESSION);
		await prodStore.save({ refreshToken: "prod-rt" });
		await devStore.clear();
		expect(await prodStore.load()).toEqual({ refreshToken: "prod-rt" });
		expect(JSON.parse(await readFile(filePath, "utf8"))).toEqual({
			prod: { refreshToken: "prod-rt" },
		});
	});

	test("moves a file session into the keychain once one is available", async () => {
		await createTokenStore({
			account: ACCOUNT,
			filePath,
			keyring: missingKeyring,
		}).save({ refreshToken: "old" });
		const { keyring, state } = memoryKeyring();
		const store = createTokenStore({ account: ACCOUNT, filePath, keyring });
		expect(await store.load()).toEqual({ refreshToken: "old" });
		await store.save(SESSION);
		expect(state.value).not.toBeNull();
		expect(JSON.parse(await readFile(filePath, "utf8"))).toEqual({});
	});

	test("treats a corrupt entry as signed out", async () => {
		const { keyring, state } = memoryKeyring();
		state.value = "not json";
		const store = createTokenStore({ account: ACCOUNT, filePath, keyring });
		expect(await store.load()).toBeNull();
	});

	test("clear fails loudly when the keychain entry can't be deleted", async () => {
		const { keyring, state } = memoryKeyring();
		state.value = JSON.stringify(SESSION);
		// A locked keychain: reads work, the delete is refused.
		const stuck: Keyring = {
			...keyring,
			delete: () => {
				throw new Error("keychain locked");
			},
		};
		const store = createTokenStore({
			account: ACCOUNT,
			filePath,
			keyring: stuck,
		});
		await expect(store.clear()).rejects.toThrow("Couldn't remove the sign-in");
	});

	test("lock runs one holder at a time, across store instances", async () => {
		const events: string[] = [];
		const hold = (name: string) => async () => {
			events.push(`${name}:start`);
			await new Promise((resolve) => setTimeout(resolve, 30));
			events.push(`${name}:end`);
		};
		// Two stores on one file stand in for two `xolace` processes.
		const first = createTokenStore({
			account: "dev",
			filePath,
			keyring: missingKeyring,
		});
		const second = createTokenStore({
			account: "prod",
			filePath,
			keyring: missingKeyring,
		});
		await Promise.all([first.lock(hold("a")), second.lock(hold("b"))]);
		// Either may win the race; what matters is that they never overlap.
		expect([
			["a:start", "a:end", "b:start", "b:end"],
			["b:start", "b:end", "a:start", "a:end"],
		]).toContainEqual(events);
		await expect(stat(`${filePath}.lock`)).rejects.toThrow();
	});

	test("lock releases when the action throws", async () => {
		const store = createTokenStore({
			account: ACCOUNT,
			filePath,
			keyring: missingKeyring,
		});
		await expect(
			store.lock(() => Promise.reject(new Error("boom")))
		).rejects.toThrow("boom");
		expect(await store.lock(() => Promise.resolve("next"))).toBe("next");
	});
});

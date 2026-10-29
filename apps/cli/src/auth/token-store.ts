/**
 * Where the signed-in session lives between runs: the OS keychain, or a `0600`
 * file when there is no keychain (Linux servers and SSH often lack Secret
 * Service). One entry per Clerk issuer, so dev and prod sign-ins don't collide.
 *
 * Each entry carries `savedAt`, and `load` takes the newer of the two places, so a
 * failed write or cleanup on one side never leaves an older refresh token in charge.
 *
 * `load`, `save` and `clear` don't lock: callers that read, decide and write wrap
 * the whole sequence in `lock`, so another `xolace` process can't interleave.
 */
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { Entry } from "@napi-rs/keyring";
import { withFileLock } from "./file-lock";

export interface StoredSession {
	/** Cached so each command doesn't spend (and rotate) the refresh token. */
	idToken?: string;
	refreshToken: string;
}

export interface TokenStore {
	/** Throws if the keychain entry survives; reporting "signed out" would be a lie. */
	clear: () => Promise<void>;
	load: () => Promise<StoredSession | null>;
	/** Runs `action` holding a lock shared by every `xolace` process on the machine. */
	lock: <T>(action: () => Promise<T>) => Promise<T>;
	save: (session: StoredSession) => Promise<void>;
}

/** The slice of a keychain entry the store uses; throws when there's no keychain. */
export interface Keyring {
	delete: () => void;
	get: () => string | null | undefined;
	set: (value: string) => void;
}

const KEYRING_SERVICE = "xolace-cli";
const FILE_MODE = 0o600;
const DIR_MODE = 0o700;

export const keyringFor = (account: string): Keyring => {
	const entry = new Entry(KEYRING_SERVICE, account);
	return {
		delete: () => {
			entry.deletePassword();
		},
		get: () => entry.getPassword(),
		set: (value) => {
			entry.setPassword(value);
		},
	};
};

export const defaultCredentialsPath = (
	env: Record<string, string | undefined> = process.env
) =>
	join(
		env.XDG_CONFIG_HOME ?? join(homedir(), ".config"),
		"xolace",
		"credentials.json"
	);

const parseSession = (raw: unknown): StoredSession | null => {
	if (typeof raw !== "object" || raw === null) {
		return null;
	}
	const { idToken, refreshToken } = { ...raw } as Record<string, unknown>;
	if (typeof refreshToken !== "string") {
		return null;
	}
	return typeof idToken === "string"
		? { idToken, refreshToken }
		: { refreshToken };
};

/** When `save` wrote this entry; 0 for entries written before it was recorded. */
const savedAtOf = (raw: unknown) =>
	typeof raw === "object" &&
	raw !== null &&
	"savedAt" in raw &&
	typeof raw.savedAt === "number"
		? raw.savedAt
		: 0;

const parseJson = (text: string): unknown => {
	try {
		return JSON.parse(text);
	} catch {
		return null;
	}
};

const readFileSessions = async (
	path: string
): Promise<Record<string, unknown>> => {
	try {
		const parsed = parseJson(await readFile(path, "utf8"));
		return typeof parsed === "object" && parsed !== null ? { ...parsed } : {};
	} catch {
		return {};
	}
};

const writeFileSessions = async (
	path: string,
	sessions: Record<string, unknown>
) => {
	await mkdir(dirname(path), { mode: DIR_MODE, recursive: true });
	// Write a fresh 0600 file and rename it over the old one, so a reader never
	// sees half a file and the mode never depends on what was there before.
	const temporary = `${path}.${process.pid}.tmp`;
	await writeFile(temporary, `${JSON.stringify(sessions, null, 2)}\n`, {
		mode: FILE_MODE,
	});
	await rename(temporary, path);
};

const tryKeyring = <T>(
	action: () => T
): { ok: true; value: T } | { ok: false } => {
	try {
		return { ok: true, value: action() };
	} catch {
		return { ok: false };
	}
};

export const createTokenStore = ({
	account,
	filePath = defaultCredentialsPath(),
	keyring = keyringFor(account),
}: {
	account: string;
	filePath?: string;
	keyring?: Keyring;
}): TokenStore => {
	const removeFromFile = async () => {
		const sessions = await readFileSessions(filePath);
		if (account in sessions) {
			delete sessions[account];
			await writeFileSessions(filePath, sessions);
		}
	};

	return {
		clear: async () => {
			tryKeyring(keyring.delete);
			await removeFromFile();
			// A failed delete is fine when there's no keychain at all (get throws
			// too), not when the entry is still there to sign the next command in.
			const left = tryKeyring(keyring.get);
			if (left.ok && left.value) {
				throw new Error(
					"Couldn't remove the sign-in from the OS keychain. Unlock it and run `xolace logout` again."
				);
			}
		},
		// Both places can hold an entry: `save` falls back to the file when the
		// keychain refuses, and its cleanup of the other place can fail. The newer
		// save wins; on a tie (or entries from before `savedAt`) the file does,
		// since it's only written when the keychain wasn't.
		load: async () => {
			const fromFile: unknown = (await readFileSessions(filePath))[account];
			const keyringRead = tryKeyring(keyring.get);
			const fromKeyring =
				keyringRead.ok && keyringRead.value
					? parseJson(keyringRead.value)
					: undefined;
			if (fromFile === undefined || fromKeyring === undefined) {
				return parseSession(fromFile ?? fromKeyring ?? null);
			}
			return parseSession(
				savedAtOf(fromKeyring) > savedAtOf(fromFile) ? fromKeyring : fromFile
			);
		},
		// One lock for every issuer: the file fallback holds them all in one file.
		lock: (action) => withFileLock(`${filePath}.lock`, action),
		save: async (session) => {
			const sessions = await readFileSessions(filePath);
			// Strictly newer than the file entry it replaces, so `load` can tell.
			const savedAt = Math.max(Date.now(), savedAtOf(sessions[account]) + 1);
			const stamped = { ...session, savedAt };
			if (tryKeyring(() => keyring.set(JSON.stringify(stamped))).ok) {
				if (account in sessions) {
					delete sessions[account];
					await writeFileSessions(filePath, sessions);
				}
				return;
			}
			sessions[account] = stamped;
			await writeFileSessions(filePath, sessions);
		},
	};
};

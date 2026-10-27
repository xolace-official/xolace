/**
 * Where the signed-in session lives between runs: the OS keychain, or a `0600`
 * file when there is no keychain (Linux servers and SSH often lack Secret
 * Service). One entry per Clerk issuer, so dev and prod sign-ins don't collide.
 */
import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { Entry } from "@napi-rs/keyring";

export interface StoredSession {
	/** Cached so each command doesn't spend (and rotate) the refresh token. */
	idToken?: string;
	refreshToken: string;
}

export interface TokenStore {
	clear: () => Promise<void>;
	load: () => Promise<StoredSession | null>;
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
	await writeFile(path, `${JSON.stringify(sessions, null, 2)}\n`, {
		mode: FILE_MODE,
	});
	// writeFile's mode applies only when it creates the file.
	await chmod(path, FILE_MODE);
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
		},
		load: async () => {
			const fromKeyring = tryKeyring(keyring.get);
			if (fromKeyring.ok && fromKeyring.value) {
				return parseSession(parseJson(fromKeyring.value));
			}
			return parseSession((await readFileSessions(filePath))[account]);
		},
		save: async (session) => {
			if (tryKeyring(() => keyring.set(JSON.stringify(session))).ok) {
				await removeFromFile();
				return;
			}
			const sessions = await readFileSessions(filePath);
			sessions[account] = session;
			await writeFileSessions(filePath, sessions);
		},
	};
};

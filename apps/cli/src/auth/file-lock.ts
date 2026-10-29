/**
 * A lock that every `xolace` process on the machine respects: a lock file created
 * with O_EXCL. Held only around reading and writing the stored session (and the
 * refresh in between), so waits are short.
 *
 * The file holds `<pid> <owner token>`. A waiter breaks the lock only once that
 * pid has exited, never just because the holder is slow, and a holder removes the
 * file only while it still carries its own token.
 */
import { randomUUID } from "node:crypto";
import { mkdir, open, readFile, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const LOCK_FILE_MODE = 0o600;
const DIR_MODE = 0o700;
const POLL_MS = 50;
// A lock file with no readable owner is one whose holder died between creating it
// and writing its pid; give a live holder this long to finish that write.
const UNREADABLE_LOCK_MS = 5000;
export const LOCK_WAIT_MS = 15_000;
// A breaker holds its lock for one read and one delete, so an older one crashed.
const BREAK_LOCK_STALE_MS = 5000;

const errorCode = (error: unknown) =>
	typeof error === "object" && error !== null && "code" in error
		? error.code
		: undefined;

interface Owner {
	pid: number;
	token?: string;
}

const parseOwner = (text: string): Owner | null => {
	const [pidText, token] = text.trim().split(" ");
	const pid = Number(pidText);
	if (!Number.isInteger(pid) || pid <= 0) {
		return null;
	}
	return token ? { pid, token } : { pid };
};

/** The lock file's text, or null once it's gone. */
const readLock = async (path: string) => {
	try {
		return await readFile(path, "utf8");
	} catch (error) {
		if (errorCode(error) === "ENOENT") {
			return null;
		}
		throw error;
	}
};

export const isProcessAlive = (pid: number) => {
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		// EPERM: it exists but belongs to someone else.
		return errorCode(error) === "EPERM";
	}
};

const tryCreate = async (path: string, token: string) => {
	try {
		const handle = await open(path, "wx", LOCK_FILE_MODE);
		await handle.write(`${process.pid} ${token}`);
		await handle.close();
		return true;
	} catch (error) {
		if (errorCode(error) === "EEXIST") {
			return false;
		}
		throw error;
	}
};

const ageOf = async (path: string, now: number) => {
	try {
		return now - (await stat(path)).mtimeMs;
	} catch {
		return null;
	}
};

/**
 * Deletes an abandoned lock that still reads `expected`. Breakers take turns
 * through a second lock file, and only a breaker or the dead owner ever removes
 * the lock, so the check-then-delete can't hit a lock a live process just took.
 * Returns false when another waiter is breaking it.
 */
const breakAbandoned = async (path: string, expected: string, now: number) => {
	const breakPath = `${path}.break`;
	if (!(await tryCreate(breakPath, randomUUID()))) {
		const age = await ageOf(breakPath, now);
		if (age !== null && age > BREAK_LOCK_STALE_MS) {
			await rm(breakPath, { force: true });
		}
		return false;
	}
	try {
		if ((await readLock(path)) === expected) {
			await rm(path, { force: true });
		}
		return true;
	} finally {
		await rm(breakPath, { force: true });
	}
};

const isAbandoned = (
	text: string,
	firstSeen: Map<string, number>,
	now: number
) => {
	const owner = parseOwner(text);
	if (owner) {
		return !isProcessAlive(owner.pid);
	}
	const seen = firstSeen.get(text) ?? now;
	firstSeen.set(text, seen);
	return now - seen > UNREADABLE_LOCK_MS;
};

const acquire = async (
	path: string,
	token: string,
	deadline: number,
	// When each unreadable lock text was first seen, to time it out.
	firstSeen = new Map<string, number>()
): Promise<void> => {
	if (await tryCreate(path, token)) {
		return;
	}
	const text = await readLock(path);
	const now = Date.now();
	if (text === null) {
		// Released between our create attempt and now: retry straight away.
		return acquire(path, token, deadline, firstSeen);
	}
	if (
		isAbandoned(text, firstSeen, now) &&
		(await breakAbandoned(path, text, now))
	) {
		return acquire(path, token, deadline, firstSeen);
	}
	if (now > deadline) {
		throw new Error(
			`Another xolace process is holding ${path}. Try again, or delete the file if none is running.`
		);
	}
	await sleep(POLL_MS);
	return acquire(path, token, deadline, firstSeen);
};

export const withFileLock = async <T>(
	path: string,
	action: () => Promise<T>,
	waitMs = LOCK_WAIT_MS
): Promise<T> => {
	await mkdir(dirname(path), { mode: DIR_MODE, recursive: true });
	const token = randomUUID();
	await acquire(path, token, Date.now() + waitMs);
	try {
		return await action();
	} finally {
		// Never delete a lock some other holder has taken since.
		if ((await readLock(path)) === `${process.pid} ${token}`) {
			await rm(path, { force: true });
		}
	}
};

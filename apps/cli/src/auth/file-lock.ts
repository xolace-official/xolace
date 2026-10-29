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
import { mkdir, open, readFile, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const LOCK_FILE_MODE = 0o600;
const DIR_MODE = 0o700;
const POLL_MS = 50;
// A lock file with no readable owner is one whose holder died between creating it
// and writing its pid; give a live holder this long to finish that write.
const UNREADABLE_LOCK_MS = 5000;
export const LOCK_WAIT_MS = 15_000;

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

const releaseIfOwned = async (path: string, mine: string) => {
	if ((await readLock(path)) === mine) {
		await rm(path, { force: true });
	}
};

/** First sighting of each unreadable lock text, per file, to time it out. */
interface Sightings {
	break: Map<string, number>;
	lock: Map<string, number>;
}

const isAbandoned = (text: string, seen: Map<string, number>, now: number) => {
	const owner = parseOwner(text);
	if (owner) {
		return !isProcessAlive(owner.pid);
	}
	const first = seen.get(text) ?? now;
	seen.set(text, first);
	return now - first > UNREADABLE_LOCK_MS;
};

/**
 * Deletes an abandoned lock that still reads `expected`. Breakers take turns
 * through a second lock file with the same owner rules, and only a breaker or the
 * dead owner ever removes the lock, so the check-then-delete can't hit a lock a
 * live process just took. Returns false when another waiter is breaking it.
 */
const breakAbandoned = async (
	path: string,
	expected: string,
	sightings: Sightings,
	now: number
) => {
	const breakPath = `${path}.break`;
	const token = randomUUID();
	if (!(await tryCreate(breakPath, token))) {
		const held = await readLock(breakPath);
		// A breaker that exited mid-break. Two waiters clearing it at once is the
		// one race left, and it needs a crash inside a break to start.
		if (held !== null && isAbandoned(held, sightings.break, now)) {
			await releaseIfOwned(breakPath, held);
		}
		return false;
	}
	try {
		await releaseIfOwned(path, expected);
		return true;
	} finally {
		await releaseIfOwned(breakPath, `${process.pid} ${token}`);
	}
};

const acquire = async (
	path: string,
	token: string,
	deadline: number,
	sightings: Sightings = { break: new Map(), lock: new Map() }
): Promise<void> => {
	if (await tryCreate(path, token)) {
		return;
	}
	const text = await readLock(path);
	const now = Date.now();
	if (text === null) {
		// Released between our create attempt and now: retry straight away.
		return acquire(path, token, deadline, sightings);
	}
	if (
		isAbandoned(text, sightings.lock, now) &&
		(await breakAbandoned(path, text, sightings, now))
	) {
		return acquire(path, token, deadline, sightings);
	}
	if (now > deadline) {
		throw new Error(
			`Another xolace process is holding ${path}. Try again, or delete the file if none is running.`
		);
	}
	await sleep(POLL_MS);
	return acquire(path, token, deadline, sightings);
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
		await releaseIfOwned(path, `${process.pid} ${token}`);
	}
};

/**
 * A lock that every `xolace` process on the machine respects: a lock file created
 * with O_EXCL. Held only around reading and writing the stored session (and the
 * refresh in between), so waits are short.
 */
import { mkdir, open, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const LOCK_FILE_MODE = 0o600;
const DIR_MODE = 0o700;
const POLL_MS = 50;
// A refresh is one HTTP round trip, so a holder this old has crashed.
export const STALE_LOCK_MS = 30_000;
export const LOCK_WAIT_MS = 15_000;

const errorCode = (error: unknown) =>
	typeof error === "object" && error !== null && "code" in error
		? error.code
		: undefined;

const tryCreate = async (path: string) => {
	try {
		const handle = await open(path, "wx", LOCK_FILE_MODE);
		await handle.write(String(process.pid));
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
		// Released between our create attempt and now: retry straight away.
		return null;
	}
};

const acquire = async (path: string, deadline: number): Promise<void> => {
	if (await tryCreate(path)) {
		return;
	}
	const now = Date.now();
	const age = await ageOf(path, now);
	if (age === null) {
		return acquire(path, deadline);
	}
	if (age > STALE_LOCK_MS) {
		// Two waiters can both see the stale lock; the loser of the next O_EXCL
		// create just waits again.
		await rm(path, { force: true });
		return acquire(path, deadline);
	}
	if (now > deadline) {
		throw new Error(
			`Another xolace process is holding ${path}. Try again, or delete the file if none is running.`
		);
	}
	await sleep(POLL_MS);
	return acquire(path, deadline);
};

export const withFileLock = async <T>(
	path: string,
	action: () => Promise<T>,
	waitMs = LOCK_WAIT_MS
): Promise<T> => {
	await mkdir(dirname(path), { mode: DIR_MODE, recursive: true });
	await acquire(path, Date.now() + waitMs);
	try {
		return await action();
	} finally {
		await rm(path, { force: true });
	}
};

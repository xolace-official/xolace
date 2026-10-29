import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
	mkdtemp,
	readFile,
	rm,
	stat,
	utimes,
	writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { isProcessAlive, withFileLock } from "./file-lock";

const MS_PER_SECOND = 1000;
const AN_HOUR_MS = 3_600_000;
let dir: string;
let lockPath: string;

/** The pid of a process that has already exited. */
const deadPid = () => spawnSync("true").pid;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "xolace-lock-test-"));
	lockPath = join(dir, "nested", "credentials.json.lock");
	await withFileLock(lockPath, () => Promise.resolve());
});

afterEach(async () => {
	await rm(dir, { force: true, recursive: true });
});

describe("withFileLock", () => {
	test("breaks a lock left by a process that has exited", async () => {
		const pid = deadPid();
		expect(isProcessAlive(pid)).toBe(false);
		await writeFile(lockPath, `${pid} crashed-owner`);
		expect(await withFileLock(lockPath, () => Promise.resolve("ran"))).toBe(
			"ran"
		);
		await expect(stat(lockPath)).rejects.toThrow();
	});

	test("never steals a live holder's lock, however old", async () => {
		await writeFile(lockPath, `${process.pid} live-owner`);
		const old = (Date.now() - AN_HOUR_MS) / MS_PER_SECOND;
		await utimes(lockPath, old, old);
		await expect(
			withFileLock(lockPath, () => Promise.resolve(), 100)
		).rejects.toThrow("Another xolace process");
		expect(await readFile(lockPath, "utf8")).toBe(`${process.pid} live-owner`);
	});

	test("releases only a lock it still owns", async () => {
		// Stands in for another process that took the lock over mid-action.
		const other = `${process.pid} other-owner`;
		await withFileLock(lockPath, () => writeFile(lockPath, other));
		expect(await readFile(lockPath, "utf8")).toBe(other);
	});

	test("waiters breaking the same dead lock never overlap", async () => {
		await writeFile(lockPath, `${deadPid()} crashed-owner`);
		let holders = 0;
		let most = 0;
		const hold = async () => {
			holders += 1;
			most = Math.max(most, holders);
			await new Promise((resolve) => setTimeout(resolve, 20));
			holders -= 1;
		};
		await Promise.all([
			withFileLock(lockPath, hold),
			withFileLock(lockPath, hold),
			withFileLock(lockPath, hold),
		]);
		expect(most).toBe(1);
		await expect(stat(lockPath)).rejects.toThrow();
	});
});

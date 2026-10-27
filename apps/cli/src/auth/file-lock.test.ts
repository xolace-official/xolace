import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { STALE_LOCK_MS, withFileLock } from "./file-lock";

const MS_PER_SECOND = 1000;
let dir: string;
let lockPath: string;

beforeEach(async () => {
	dir = await mkdtemp(join(tmpdir(), "xolace-lock-test-"));
	lockPath = join(dir, "nested", "credentials.json.lock");
});

afterEach(async () => {
	await rm(dir, { force: true, recursive: true });
});

describe("withFileLock", () => {
	test("breaks a lock left by a crashed process", async () => {
		await withFileLock(lockPath, () => Promise.resolve());
		await writeFile(lockPath, "12345");
		const old = (Date.now() - STALE_LOCK_MS * 2) / MS_PER_SECOND;
		await utimes(lockPath, old, old);
		expect(await withFileLock(lockPath, () => Promise.resolve("ran"))).toBe(
			"ran"
		);
	});

	test("gives up on a live lock after the wait", async () => {
		await withFileLock(lockPath, () => Promise.resolve());
		await writeFile(lockPath, "12345");
		await expect(
			withFileLock(lockPath, () => Promise.resolve(), 100)
		).rejects.toThrow("Another xolace process");
	});
});

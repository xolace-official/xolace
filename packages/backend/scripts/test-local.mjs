/**
 * `bun run test:local`: integration checks against a LOCAL Convex backend.
 *
 * Refuses to run unless packages/backend/.env.local points at an anonymous or
 * local deployment on 127.0.0.1 and no deploy key or self-hosted URL is in
 * play, so it can never push to or mutate a cloud deployment.
 *
 * One-time setup (no Convex account needed):
 *   CONVEX_AGENT_MODE=anonymous bunx convex dev --once
 *   bunx convex env set CLERK_JWT_ISSUER_DOMAIN https://test.clerk.accounts.dev
 *
 * Modelled on convex-credits' example-backend/scripts/test-local.mjs.
 */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parseEnv, promisify } from "node:util";

const exec = promisify(execFile);
const packageDir = new URL("..", import.meta.url);
const LOCAL_DEPLOYMENT = /^(anonymous|local):/;
const LOCAL_URL = /^http:\/\/127\.0\.0\.1:\d+\/?$/;

let envFile;
try {
	envFile = await readFile(new URL(".env.local", packageDir), "utf8");
} catch (error) {
	throw new Error(
		"packages/backend/.env.local is missing. Create a local deployment first: " +
			"`CONVEX_AGENT_MODE=anonymous bunx convex dev --once`.",
		{ cause: error }
	);
}
const env = parseEnv(envFile);

assert.match(
	env.CONVEX_DEPLOYMENT ?? "",
	LOCAL_DEPLOYMENT,
	"Refusing: CONVEX_DEPLOYMENT in .env.local must be an anonymous: or local: deployment"
);
// `convex dev` writes CONVEX_URL, or VITE_CONVEX_URL when vite is installed.
const convexUrl = env.CONVEX_URL ?? env.VITE_CONVEX_URL ?? "";
assert.match(
	convexUrl,
	LOCAL_URL,
	"Refusing: the Convex URL in .env.local must be http://127.0.0.1:<port>"
);
for (const source of [env, process.env]) {
	assert.ok(
		!(source.CONVEX_DEPLOY_KEY || source.CONVEX_SELF_HOSTED_URL),
		"Refusing: CONVEX_DEPLOY_KEY / CONVEX_SELF_HOSTED_URL would target a non-local backend"
	);
}
assert.ok(
	!process.env.CONVEX_DEPLOYMENT ||
		LOCAL_DEPLOYMENT.test(process.env.CONVEX_DEPLOYMENT),
	"Refusing: CONVEX_DEPLOYMENT in the shell overrides .env.local with a non-local deployment"
);

const convex = (args) =>
	exec(
		"bunx",
		["--no-install", "convex", ...args, "--env-file", ".env.local"],
		{
			cwd: packageDir,
			maxBuffer: 1024 * 1024,
		}
	);

// Push the current functions to the local backend, then exercise them.
await convex(["dev", "--once", "--typecheck", "disable"]);

const { stdout } = await convex(["run", "healthCheck:get"]);
assert.equal(JSON.parse(stdout), "OK");

// Phase 2: add real integration cases here (concurrency, idempotency, quota
// races), in the style of convex-credits' local suite.

process.stdout.write(`Local Convex passed against ${convexUrl}.\n`);

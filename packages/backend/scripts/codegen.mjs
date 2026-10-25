/**
 * `bun run codegen`: regenerate convex/_generated when a deployment is set.
 *
 * `convex codegen` has to evaluate the app (components, auth config) against a
 * deployment, so it fails on a fresh clone with no CONVEX_DEPLOYMENT. Turbo
 * runs `codegen` before every `check-types` and `test`, and convex/_generated
 * is committed, so without a deployment this skips instead of failing.
 *
 * Pass `--require` (the CI codegen-drift check does) to fail rather than skip.
 * A local anonymous backend is enough: `CONVEX_AGENT_MODE=anonymous bunx convex dev --once`.
 */
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";

const packageDir = new URL("..", import.meta.url);
const required = process.argv.includes("--require");

const readEnvLocal = async () => {
	try {
		return parseEnv(await readFile(new URL(".env.local", packageDir), "utf8"));
	} catch {
		return {};
	}
};

const envLocal = await readEnvLocal();
const hasDeployment = Boolean(
	process.env.CONVEX_DEPLOYMENT ||
		process.env.CONVEX_DEPLOY_KEY ||
		process.env.CONVEX_SELF_HOSTED_URL ||
		envLocal.CONVEX_DEPLOYMENT
);

if (!hasDeployment) {
	const message =
		"convex codegen skipped: no Convex deployment configured (set one up with `bun run dev:setup`, or `CONVEX_AGENT_MODE=anonymous bunx convex dev --once` for a local one). Using the committed convex/_generated.\n";
	if (required) {
		process.stderr.write(message);
		process.exit(1);
	}
	process.stdout.write(message);
	process.exit(0);
}

const result = spawnSync("bunx", ["--no-install", "convex", "codegen"], {
	cwd: packageDir,
	stdio: "inherit",
});
process.exit(result.status ?? 1);

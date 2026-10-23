/**
 * Vercel build for @xolace/web: deploy Convex first, then build web against it.
 *
 * This is the ONLY place in the repo that deploys Convex (plan Phase 3).
 * `apps/web/vercel.json` runs it as the Vercel build command:
 *
 *   convex deploy (from packages/backend)
 *     --cmd 'turbo run build -F @xolace/web'
 *     --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
 *
 * The target comes from `CONVEX_DEPLOY_KEY` in the Vercel project's env:
 * a production key on Production, a preview key on Preview (Convex then makes
 * or reuses a preview deployment named after the git branch). A Preview build
 * with no deploy key but a NEXT_PUBLIC_CONVEX_URL builds against that URL and
 * deploys nothing (setup guide: docs/setup/vercel.md).
 *
 * It refuses to run anywhere else, so a local `turbo run build -F @xolace/web`
 * or the desktop export (`TAURI_BUILD=1`) can never deploy. Locally, just run
 * `bunx turbo run build -F @xolace/web`; it is a plain `next build`.
 *
 * Usage: bun scripts/vercel-build.ts [--dry-run]
 *   --dry-run  check the environment and print the plan; deploy nothing.
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const BACKEND_DIR = join(REPO_ROOT, "packages/backend");
const URL_ENV_VAR = "NEXT_PUBLIC_CONVEX_URL";
const WEB_BUILD_CMD = "cd ../.. && bunx turbo run build -F @xolace/web";

/** Convex deploy keys start with their kind: `prod:...` or `preview:...`. */
const KEY_PREFIX_BY_VERCEL_ENV: Record<string, string> = {
	preview: "preview:",
	production: "prod:",
};

function fail(message: string): never {
	throw new Error(`[vercel-build] ${message}`);
}

/**
 * "deploy": convex deploy, then build web against the deployment it made.
 * "build-only": a Preview build with no deploy key; build web against the
 * NEXT_PUBLIC_CONVEX_URL set in Vercel's Preview env (e.g. the shared preview
 * deployment) without deploying, for plans or setups without preview deployments.
 */
type Mode = "deploy" | "build-only";

function checkEnvironment(env: NodeJS.ProcessEnv): Mode {
	if (env.TAURI_BUILD) {
		fail(
			"TAURI_BUILD is set. The desktop static export never deploys Convex; " +
				"build it with `bunx turbo run build -F @xolace/web`."
		);
	}
	if (env.VERCEL !== "1") {
		fail(
			"Not running on Vercel (VERCEL != 1). This script deploys Convex and " +
				"only runs as the Vercel build. Locally use " +
				"`bunx turbo run build -F @xolace/web`."
		);
	}
	const vercelEnv = env.VERCEL_ENV ?? "";
	const expectedPrefix = KEY_PREFIX_BY_VERCEL_ENV[vercelEnv];
	if (!expectedPrefix) {
		fail(
			`VERCEL_ENV is "${vercelEnv}". Only Production and Preview builds ` +
				"deploy Convex; there is no Convex deploy for Vercel Development."
		);
	}
	const key = env.CONVEX_DEPLOY_KEY;
	if (!key && vercelEnv === "preview" && env[URL_ENV_VAR]) {
		return "build-only";
	}
	if (!key) {
		fail(
			`CONVEX_DEPLOY_KEY is not set for Vercel ${vercelEnv}. Add the ` +
				`${vercelEnv === "production" ? "production" : "preview"} deploy ` +
				"key to this Vercel project's env for that environment only" +
				(vercelEnv === "preview"
					? `, or set ${URL_ENV_VAR} on Preview to build without deploying.`
					: ".")
		);
	}
	if (!key.startsWith(expectedPrefix)) {
		fail(
			`CONVEX_DEPLOY_KEY is not a ${expectedPrefix.slice(0, -1)} key, but ` +
				`VERCEL_ENV is ${vercelEnv}. Scope the production key to ` +
				"Production and the preview key to Preview."
		);
	}
	if (env.CONVEX_DEPLOYMENT) {
		fail(
			"CONVEX_DEPLOYMENT is set. Remove it from the Vercel env; the deploy " +
				"key alone picks the target deployment."
		);
	}
	return "deploy";
}

function main(): void {
	const dryRun = process.argv.includes("--dry-run");
	const mode = checkEnvironment(process.env);

	if (mode === "build-only") {
		process.stdout.write(
			`[vercel-build] preview without CONVEX_DEPLOY_KEY: building against ${URL_ENV_VAR}, no Convex deploy.\n`
		);
		if (dryRun) {
			return;
		}
		const build = spawnSync(
			"bunx",
			["turbo", "run", "build", "-F", "@xolace/web"],
			{
				cwd: REPO_ROOT,
				stdio: "inherit",
			}
		);
		if (build.error) {
			throw build.error;
		}
		process.exitCode = build.status ?? 1;
		return;
	}

	const message = process.env.VERCEL_GIT_COMMIT_SHA
		? `vercel ${process.env.VERCEL_ENV} ${process.env.VERCEL_GIT_COMMIT_SHA}`
		: `vercel ${process.env.VERCEL_ENV}`;
	const args = [
		"convex",
		"deploy",
		"--cmd",
		WEB_BUILD_CMD,
		"--cmd-url-env-var-name",
		URL_ENV_VAR,
		"--message",
		message,
	];

	process.stdout.write(
		`[vercel-build] ${process.env.VERCEL_ENV}: bunx ${args.join(" ")} (cwd packages/backend)\n`
	);
	if (dryRun) {
		process.stdout.write("[vercel-build] --dry-run: nothing deployed.\n");
		return;
	}

	const result = spawnSync("bunx", args, {
		cwd: BACKEND_DIR,
		stdio: "inherit",
	});
	if (result.error) {
		throw result.error;
	}
	process.exitCode = result.status ?? 1;
}

main();

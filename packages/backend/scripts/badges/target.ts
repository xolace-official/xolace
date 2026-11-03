// Which deployment the badge upload talks to (#690). A bare run reaches only
// your own dev (or local) deployment; prod and staging are the release owner's,
// each behind a flag they pass on purpose.

export type Target = {
	/** Passed to every `convex` CLI call. */
	convexArgs: string[];
	label: string;
	/** Push this checkout's functions first (`convex dev --once`): dev only. */
	pushFunctions: boolean;
};

type Env = Record<string, string | undefined>;

const OWN_DEPLOYMENT = /^(dev|local|anonymous):/;

export function resolveTarget(
	args: readonly string[],
	env: Env,
	envLocal: Env
): Target {
	const prod = args.includes("--prod");
	const deployKey = args.includes("--deploy-key");
	if (prod && deployKey) {
		throw new Error("pass one of --prod and --deploy-key");
	}
	if (prod) {
		return { convexArgs: ["--prod"], label: "prod", pushFunctions: false };
	}
	if (deployKey) {
		if (!env.CONVEX_DEPLOY_KEY) {
			throw new Error("--deploy-key needs CONVEX_DEPLOY_KEY set");
		}
		return {
			convexArgs: [],
			label: "the deployment CONVEX_DEPLOY_KEY names",
			pushFunctions: false,
		};
	}
	// The Convex CLI follows a deploy key over CONVEX_DEPLOYMENT, so a key left
	// in the shell would turn a bare run into a staging or prod upload.
	if (env.CONVEX_DEPLOY_KEY) {
		throw new Error(
			"CONVEX_DEPLOY_KEY is set: unset it, or pass --deploy-key to upload to its deployment"
		);
	}
	const deployment = env.CONVEX_DEPLOYMENT ?? envLocal.CONVEX_DEPLOYMENT;
	if (!deployment) {
		throw new Error(
			"no dev deployment: run `bunx convex dev --configure` in packages/backend first"
		);
	}
	if (!OWN_DEPLOYMENT.test(deployment)) {
		throw new Error(
			`${deployment} is not a dev deployment: pass --prod or --deploy-key to upload there`
		);
	}
	return { convexArgs: [], label: deployment, pushFunctions: true };
}

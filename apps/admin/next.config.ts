import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

const withVarlock = varlockNextConfigPlugin();

const nextConfig: NextConfig = {
	reactCompiler: true,
	typedRoutes: true,
};

// Admin never deploys Convex: only the web Vercel build does (see AGENTS.md).
// A deploy key in this project's env means someone wired it like web; fail the
// build loudly instead of shipping with a key that could push the backend.
// turbo passes CONVEX_DEPLOY_KEY through to `build` so this check can see it.
function assertNoConvexDeployKey(phase: string): void {
	if (phase === PHASE_PRODUCTION_BUILD && process.env.CONVEX_DEPLOY_KEY) {
		throw new Error(
			"[admin] CONVEX_DEPLOY_KEY is set. Admin never deploys Convex; remove " +
				"the key from the admin Vercel project and set NEXT_PUBLIC_CONVEX_URL " +
				"to the deployment web deploys instead."
		);
	}
}

export default withVarlock((phase: string): NextConfig => {
	assertNoConvexDeployKey(phase);
	return { ...nextConfig };
});

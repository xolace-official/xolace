import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";

import { withPwa } from "./pwa.config";

const withVarlock = varlockNextConfigPlugin();

// apps/desktop (Tauri) loads a static export of this app; set TAURI_BUILD=1 to
// produce it in ./out. Every other build is a normal server build (Vercel).
const isTauriBuild = Boolean(process.env.TAURI_BUILD);

const nextConfig: NextConfig = {
	reactCompiler: true,
	typedRoutes: true,
	...(isTauriBuild ? { output: "export" } : {}),
};

// Web never deploys Convex: only .github/workflows/release.yml does. A deploy key
// in this project's env means someone wired it to deploy; fail the build loudly.
// turbo passes CONVEX_DEPLOY_KEY through to `build` so this check can see it.
function assertNoConvexDeployKey(phase: string): void {
	if (phase === PHASE_PRODUCTION_BUILD && process.env.CONVEX_DEPLOY_KEY) {
		throw new Error(
			"[web] CONVEX_DEPLOY_KEY is set. Web never deploys Convex; remove the " +
				"key from the web Vercel project and set NEXT_PUBLIC_CONVEX_URL instead."
		);
	}
}

export default withVarlock((phase: string): NextConfig => {
	assertNoConvexDeployKey(phase);
	return withPwa(nextConfig);
});

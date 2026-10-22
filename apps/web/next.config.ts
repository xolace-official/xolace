import { varlockNextConfigPlugin } from "@varlock/nextjs-integration/plugin";
import type { NextConfig } from "next";

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

export default withVarlock(withPwa(nextConfig));

import path from "node:path";
import { defineConfig } from "vitest/config";

// Component tests: React in happy-dom, no Next.js or Convex. Feed screens'
// presentational parts their data and assert on what an admin sees and clicks.
export default defineConfig({
	resolve: {
		alias: [
			{
				find: /^@\//,
				replacement: `${path.resolve(import.meta.dirname, "src")}/`,
			},
		],
	},
	test: {
		environment: "happy-dom",
		include: ["src/**/*.test.{ts,tsx}"],
	},
});

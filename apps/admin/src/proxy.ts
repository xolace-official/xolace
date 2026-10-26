import { clerkMiddleware } from "@clerk/nextjs/server";

import { SIGN_IN_PATH } from "@/features/auth/access";

// Session handling only. Who may see which page is decided in the route-group
// layouts (features/auth/guards.ts), as Clerk recommends over path matching here.
export default clerkMiddleware({ signInUrl: SIGN_IN_PATH });

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
		"/__clerk/(.*)",
	],
};

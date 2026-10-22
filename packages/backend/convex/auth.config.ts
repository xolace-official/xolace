import type { AuthConfig } from "convex/server";

// Clerk Frontend API URL from the Convex integration in the Clerk Dashboard.
// Set it on the Convex deployment: `bunx convex env set CLERK_JWT_ISSUER_DOMAIN <url>`.
// See https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
const clerkIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

if (!clerkIssuerDomain) {
	throw new Error(
		"CLERK_JWT_ISSUER_DOMAIN is not set on this Convex deployment. " +
			"Set it with `bunx convex env set CLERK_JWT_ISSUER_DOMAIN <Clerk Frontend API URL>`."
	);
}

export default {
	providers: [
		{
			applicationID: "convex",
			domain: clerkIssuerDomain,
		},
	],
} satisfies AuthConfig;

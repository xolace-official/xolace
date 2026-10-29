import type { AuthConfig } from "convex/server";

// Clerk Frontend API URL from the Convex integration in the Clerk Dashboard.
// Set it on the Convex deployment: `bunx convex env set CLERK_JWT_ISSUER_DOMAIN <url>`.
// See https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
const clerkIssuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;

// Client ID of the Clerk OAuth application the CLI and desktop sign in through
// (public, not a secret). Its ID tokens carry `aud=<client id>` instead of
// `aud=convex`. Optional: a deployment without it accepts session JWTs only.
const clerkOAuthClientId = process.env.CLERK_OAUTH_CLIENT_ID;

if (!clerkIssuerDomain) {
	throw new Error(
		"CLERK_JWT_ISSUER_DOMAIN is not set on this Convex deployment. " +
			"Set it with `bunx convex env set CLERK_JWT_ISSUER_DOMAIN <Clerk Frontend API URL>`."
	);
}

export default {
	providers: [
		// Session JWTs from mobile, web and admin (the Clerk `convex` JWT template).
		{
			applicationID: "convex",
			domain: clerkIssuerDomain,
		},
		// OAuth ID tokens from the CLI and desktop. Same issuer, so the same person
		// gets the same `tokenIdentifier` (`iss|sub`) and the same `users` row.
		// They carry no `role` claim: admin functions reject them.
		...(clerkOAuthClientId
			? [{ applicationID: clerkOAuthClientId, domain: clerkIssuerDomain }]
			: []),
	],
} satisfies AuthConfig;

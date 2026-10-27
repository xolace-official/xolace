# OAuth sign-in for the CLI and desktop

The CLI (`xolace login`) and the desktop app can't use Clerk's session cookies. They
sign in through a Clerk **OAuth application** instead: the system browser, PKCE, and a
redirect back to a local port (or a device code over SSH). Convex accepts the
resulting OAuth **ID token** through the second provider in
`packages/backend/convex/auth.config.ts`. It has the same issuer and `sub` as a web or
mobile login, so it's the same user (`tokenIdentifier` = `iss|sub`).

Why it's built this way, and what the spikes proved:
`docs/plan/workspace-migration-plan.md` §3.

One OAuth app per Clerk instance: **development** (local dev, staging, previews) and
**production** (prod).

## Step 1: Create the OAuth app in Clerk

Clerk dashboard → pick the instance → **Configure → OAuth applications → Add OAuth
application**:

| Setting | Value |
|---|---|
| Name | `Xolace CLI and desktop` (users see it on the consent screen) |
| Scopes | `openid`, `profile`, `email`, `offline_access` |
| Public | **On.** A CLI or desktop binary can't keep a secret, so it uses PKCE. Never ship or store the client secret |
| Device authorization grant | **On**, so `xolace login` works over SSH |
| Consent screen | On |

Then on the app's page → **Redirect URIs**, add:

- `http://127.0.0.1:53682/callback`
- `http://localhost:53682/callback`

Clerk accepts these on **any** port (RFC 8252 loopback), so the CLI can fall back to a
free port. A URI that isn't registered at all fails only after sign-in.

Copy the **Client ID**. It's public; the client secret is not needed anywhere.

## Step 2: Tell Convex about it

Set `CLERK_OAUTH_CLIENT_ID` to that Client ID on each deployment, in the Convex
dashboard → deployment → **Settings → Environment Variables**:

| Deployment | Value |
|---|---|
| Your own dev deployment | dev instance's Client ID (`bunx convex env set CLERK_OAUTH_CLIENT_ID <id>` in `packages/backend`) |
| staging (`xolace-staging` Production) | dev instance's Client ID |
| previews (`xolace-staging` Preview defaults) | dev instance's Client ID |
| prod (`energetic-guineapig-283`) | **production** instance's Client ID |

Convex reads `auth.config.ts` when it deploys, so the variable takes effect on the next
deploy of that deployment (the staging or release pipeline, or your `convex dev`).
Without it, the deployment accepts web and mobile tokens only.

## Step 3: Check it

Sign in with the CLI against a deployment that has the variable. In `apps/cli`, copy
`.env.example` to `.env` and fill in the issuer, the Client ID and the deployment's
URL, then:

```sh
bun run start login
bun run start whoami
```

`login` signs in through the OAuth app and calls `users.getMe`; "Signed in as …"
means Clerk and Convex both accept the token. Add `--device` to check the device
grant too. To see the raw claims instead (never the token), the 4a spike still works:
`SPIKE_CLERK_ISSUER=<issuer> SPIKE_CLERK_CLIENT_ID=<client id> bun spikes/oauth.ts login`.

## Limits

- **No `role` claim.** The claim comes from the `convex` session-token template, which
  OAuth ID tokens don't use. Admin functions reject OAuth tokens, so admin stays
  web-only.
- **The user must already exist.** `users.getOrCreate` (mobile and web onboarding)
  creates the `users` row; `getMe` throws `user_not_found` for a Clerk account that
  never onboarded.
- ID tokens last 24 hours. Refresh with `grant_type=refresh_token` and the client ID
  (no secret); the refresh token rotates on every use.

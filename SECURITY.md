# Security

Xolace holds people's private emotional writing. Treat every vulnerability as serious.

## Reporting a vulnerability

Report it privately through GitHub: **Security → Report a vulnerability** on this repository ([new advisory](https://github.com/xolace-official/xolace/security/advisories/new)).

- Do not open a public issue, PR or discussion about it.
- Include what you found, how to reproduce it, and what data or accounts it could expose.
- We will acknowledge the report, keep you updated while we fix it, and credit you in the advisory if you want.

## Secrets

**Never commit secrets**: API keys, deploy keys, Clerk secret keys, service-account JSON files, `google-services` files, signing certificates or `.env` files with real values. If one is committed, treat it as leaked: rotate it first, then remove it from the code.

Real values live only in the environment of the platform that uses them:

| Used by | Stored in |
|---|---|
| Mobile (`apps/mobile`) | EAS environment variables (file variables for service-account and `google-services` files) |
| Backend (`packages/backend`) | Convex deployment environment |
| Web and admin (`apps/web`, `apps/admin`) | Vercel project environment |
| CI | GitHub Actions secrets |

Each app's `.env.example` lists variable names only. Values prefixed `EXPO_PUBLIC_` or `NEXT_PUBLIC_` are shipped to users' devices and browsers, so they must never hold a secret.

## Supported versions

Only the latest release of each client and the current production backend get security fixes.

# Xolace

This project was created with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack), a modern TypeScript stack that combines Next.js, Convex, and more.

## Features

- **TypeScript** - For type safety and improved developer experience
- **Next.js** - Full-stack React framework
- **React Native** - Build mobile apps using React
- **Expo** - Tools for React Native development
- **TailwindCSS** - Utility-first CSS for rapid UI development
- **Shared UI package** - shadcn/ui primitives live in `packages/ui`
- **Convex** - Reactive backend-as-a-service platform
- **Authentication** - Clerk
- **Biome** - Linting and formatting
- **Husky** - Git hooks for code quality
- **PWA** - Progressive Web App support
- **Tauri** - Build native desktop applications
- **Turborepo** - Optimized monorepo build system

## Getting Started

First, install the dependencies:

```bash
bun install
```

## Convex Setup

This project uses Convex as a backend. You'll need to set up Convex before running the app:

```bash
bun run dev:setup
```

Follow the prompts to create a new Convex project and connect it to your application.

Copy environment variables from `packages/backend/.env.local` to `apps/*/.env`.

### Clerk Authentication Setup

- Follow the guide: [Convex + Clerk](https://docs.convex.dev/auth/clerk)
- Set `CLERK_JWT_ISSUER_DOMAIN` in Convex Dashboard
- Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in `apps/web/.env`
- Set `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` in `apps/mobile/.env` (see `apps/mobile/.env.example`)
- Set `CLERK_SECRET_KEY` in `apps/web/.env` for Clerk server middleware

Then, run the development server:

```bash
bun run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser to see the web application.
From `apps/mobile`, run the `ios` script for iOS or the `android` script for Android to build and launch the app. See [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/) for device setup.
Your app will connect to the Convex cloud backend automatically.

## UI Customization

React web apps in this stack share shadcn/ui primitives through `packages/ui`.

- Change design tokens and global styles in `packages/ui/src/styles/globals.css`
- Update shared primitives in `packages/ui/src/components/*`
- Adjust shadcn aliases or style config in `packages/ui/components.json` and `apps/web/components.json`

### Add more shared components

Run this from the project root to add more primitives to the shared UI package:

```bash
npx shadcn@latest add accordion dialog popover sheet table -c packages/ui
```

Import shared components like this:

```tsx
import { Button } from "@xolace/ui/components/button";
```

### Add app-specific blocks

If you want to add app-specific blocks instead of shared primitives, run the shadcn CLI from `apps/web`.

## Environment Configuration

- **Web and admin** (`apps/web`, `apps/admin`) use Varlock. Each owns its schema in `.env.schema`; run `bun run codegen` (or `turbo run codegen`) to generate `src/env.ts`. Deployed values come from Vercel env.
- **Mobile** (`apps/mobile`) reads plain `process.env.EXPO_PUBLIC_*` values. Locally they come from `apps/mobile/.env` (names listed in `.env.example`); builds get them from EAS env.
- **Backend** (`packages/backend`) reads its configuration from the Convex deployment's environment.

Bun's automatic env loading is disabled in `bunfig.toml`; the framework integration loads Varlock.

## Deployment

Merging `dev` into `main` is a release. `.github/workflows/release.yml` deploys Convex
to prod first, then starts the clients: the EAS mobile release
(`apps/mobile/.eas/workflows/release.yml`) and Vercel deploy hooks for web and admin
(two Vercel projects rooted at `apps/web` and `apps/admin`). Nothing deploys from a
laptop. Setup: [docs/setup/release.md](docs/setup/release.md).

## Git Hooks and Formatting

- Initialize hooks: `bun run prepare`
- Run checks: `bun run check`

## Project Structure

```
xolace/
├── apps/
│   ├── web/         # User-facing web app (Next.js; static export feeds desktop)
│   ├── admin/       # Internal admin dashboard (Next.js)
│   ├── desktop/     # Tauri shell around apps/web's static export
│   ├── mobile/      # Mobile app (React Native, Expo)
│   ├── cli/         # Terminal client (OpenTUI)
│   └── docs/        # Documentation site (fumadocs)
├── packages/
│   ├── ui/          # Shared shadcn/ui components and styles (web + admin)
│   ├── backend/     # Convex backend functions and schema
│   └── config/      # Shared TypeScript config
```

## Available Scripts

- `bun run dev`: Start all applications in development mode
- `bun run dev:web` / `dev:admin` / `dev:mobile` / `dev:desktop` / `dev:cli` / `dev:docs`: Start one app
- `bun run dev:server`: Start the Convex dev server
- `bun run dev:setup`: Setup and configure your Convex project
- `bun run build`: Build all applications
- `bun run check-types`: Type-check every package
- `bun run lint`: Run Biome per package (through Turborepo)
- `bun run test`: Run tests
- `bun run codegen`: Run code generation (Varlock env types, fumadocs sources)
- `bun run check` / `bun run fix`: Run Ultracite (Biome) across the repo

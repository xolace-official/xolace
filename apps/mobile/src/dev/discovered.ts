// Metro's `require.context` types; `expo-env.d.ts`, which loads them for the
// app, is generated and gitignored, so CI's typecheck would lack them.
/// <reference types="expo/types/metro-require" />
/** Every feature's dev states, found by Metro when it bundles: a feature adds a
 * `dev/states.tsx` and it's here, with no line to add. Node can't run
 * `require.context`, so the rules live in `registry.ts`, tested there and run on
 * the real files by `states-files.test.ts`. */
import { devRegistry } from "@/dev/registry";

const files = require.context("../features", true, /\/dev\/states\.tsx$/);

export const DEV_REGISTRY = devRegistry(
	files.keys().map((path) => ({ exports: files(path), path }))
);

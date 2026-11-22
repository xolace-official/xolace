// Metro's `require.context` types; `expo-env.d.ts`, which loads them for the
// app, is generated and gitignored, so CI's typecheck would lack them.
/// <reference types="expo/types/metro-require" />
import { devRegistry } from "@/dev/registry";

const files = require.context("../features", true, /\/dev\/states\.tsx$/);

export const DEV_REGISTRY = devRegistry(
	files.keys().map((path) => ({ exports: files(path), path }))
);

// Reexport the native module. On web, it will be resolved to NativeCoreHapticsModule.web.ts
// and on native platforms to NativeCoreHapticsModule.ts
export * from "./src/NativeCoreHaptics.types";
export { default } from "./src/NativeCoreHapticsModule";

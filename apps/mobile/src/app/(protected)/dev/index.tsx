/** Dev tools › Dev states. A release build folds the `require` away, so `src/dev`
 * never reaches its bundle (`devCodeInReleaseGraph`, `feature-shape.ts`). */
type Screen = typeof import("@/dev/dev-index-screen");

const dev: Screen | null = __DEV__ ? require("@/dev/dev-index-screen") : null;

export default dev?.DevIndexScreen ?? (() => null);

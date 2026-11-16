/** `xolace://dev/<feature>/<state>`. A release build folds the `require` away, so
 * `src/dev` never reaches its bundle (`devCodeInReleaseGraph`, `feature-shape.ts`). */
type Screen = typeof import("@/dev/dev-state-screen");

const dev: Screen | null = __DEV__ ? require("@/dev/dev-state-screen") : null;

export default dev?.DevStateScreen ?? (() => null);

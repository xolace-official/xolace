type Screen = typeof import("@/dev/dev-state-screen");

const dev: Screen | null = __DEV__ ? require("@/dev/dev-state-screen") : null;

export default dev?.DevStateScreen ?? (() => null);

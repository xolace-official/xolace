type Screen = typeof import("@/dev/dev-index-screen");

const dev: Screen | null = __DEV__ ? require("@/dev/dev-index-screen") : null;

export default dev?.DevIndexScreen ?? (() => null);

import { StyleSheet } from "react-native";

const DEBUG_TRACK_COLOR = "var(--accent)";
const DEBUG_OVERLAY_COLOR = "var(--warning)";

export const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  containerDebug: {
    borderWidth: 1,
    borderColor: DEBUG_TRACK_COLOR,
    overflow: "visible",
  },
  trackDebug: {
    height: 1,
    backgroundColor: DEBUG_TRACK_COLOR,
  },
  translateContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  rotateContainer: {
    minWidth: 1,
    overflow: "hidden",
  },
  overlayDebug: {
    borderWidth: 1,
    borderColor: DEBUG_OVERLAY_COLOR,
  },
  maskSizer: {
    opacity: 0,
  },
});

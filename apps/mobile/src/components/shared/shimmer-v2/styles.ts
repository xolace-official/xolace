import { StyleSheet } from "react-native";

// Debug-only visualization colors — not theme tokens. Referenced via constants
// so react-native/no-color-literals doesn't flag these intentional literals.
const DEBUG_OUTLINE = "green";
const DEBUG_OVERLAY_OUTLINE = "lime";
const TRANSPARENT = "transparent";

export const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  containerDebug: {
    borderWidth: 1,
    borderColor: DEBUG_OUTLINE,
    overflow: "visible",
  },
  trackDebug: {
    height: 1,
    backgroundColor: DEBUG_OUTLINE,
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
    borderColor: DEBUG_OVERLAY_OUTLINE,
  },
  maskSizer: {
    opacity: 0,
  },
  overlayTrack: {
    alignItems: "center",
    justifyContent: "center",
  },
  directionArrow: {
    position: "absolute",
    backgroundColor: TRANSPARENT,
    borderStyle: "solid",
    borderLeftWidth: 18,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: DEBUG_OUTLINE,
    borderTopColor: TRANSPARENT,
    borderBottomColor: TRANSPARENT,
  },
});

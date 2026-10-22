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
		borderColor: DEBUG_OUTLINE,
		borderWidth: 1,
		overflow: "visible",
	},
	directionArrow: {
		backgroundColor: TRANSPARENT,
		borderBottomColor: TRANSPARENT,
		borderBottomWidth: 8,
		borderLeftColor: DEBUG_OUTLINE,
		borderLeftWidth: 18,
		borderStyle: "solid",
		borderTopColor: TRANSPARENT,
		borderTopWidth: 8,
		position: "absolute",
	},
	maskSizer: {
		opacity: 0,
	},
	overlayDebug: {
		borderColor: DEBUG_OVERLAY_OUTLINE,
		borderWidth: 1,
	},
	overlayTrack: {
		alignItems: "center",
		justifyContent: "center",
	},
	rotateContainer: {
		minWidth: 1,
		overflow: "hidden",
	},
	trackDebug: {
		backgroundColor: DEBUG_OUTLINE,
		height: 1,
	},
	translateContainer: {
		alignItems: "center",
		bottom: 0,
		justifyContent: "center",
		left: 0,
		overflow: "hidden",
		position: "absolute",
		top: 0,
	},
});

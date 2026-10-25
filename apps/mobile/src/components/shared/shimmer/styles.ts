import { StyleSheet } from "react-native";

const DEBUG_TRACK_COLOR = "var(--accent)";
const DEBUG_OVERLAY_COLOR = "var(--warning)";

export const styles = StyleSheet.create({
	container: {
		overflow: "hidden",
	},
	containerDebug: {
		borderColor: DEBUG_TRACK_COLOR,
		borderWidth: 1,
		overflow: "visible",
	},
	maskSizer: {
		opacity: 0,
	},
	overlayDebug: {
		borderColor: DEBUG_OVERLAY_COLOR,
		borderWidth: 1,
	},
	rotateContainer: {
		minWidth: 1,
		overflow: "hidden",
	},
	trackDebug: {
		backgroundColor: DEBUG_TRACK_COLOR,
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

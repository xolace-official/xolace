import type { TextStyle } from "react-native";

/**
 * The writing box's type (board `.wbox`: system 20/1.5, −.005em), over the `compose` step. The
 * field, its warm-word overlay and the line-end meter all share it, so their lines wrap alike.
 */
export const FIELD_TEXT = {
	fontSize: 20,
	letterSpacing: -0.1,
	lineHeight: 30,
} as const satisfies TextStyle;

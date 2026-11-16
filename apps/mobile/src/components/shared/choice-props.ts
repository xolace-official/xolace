import type { StyleProp, ViewStyle } from "react-native";

/** One choice in a `Segmented` control or a `CountryMenu`. */
export type Choice<T extends string> = { id: T; label: string };

/** Shared by the iOS (SwiftUI) and Android (Compose) files of each control. */
export type ChoiceProps<T extends string> = {
	options: readonly Choice<T>[];
	value: T;
	onChange: (value: T) => void;
};

export type SegmentedProps<T extends string> = ChoiceProps<T> & {
	style?: StyleProp<ViewStyle>;
	className?: string;
};

/** The label of the chosen option, or the value itself if no option has it. */
export const labelOf = <T extends string>(
	options: readonly Choice<T>[],
	value: T
): string => options.find((o) => o.id === value)?.label ?? value;

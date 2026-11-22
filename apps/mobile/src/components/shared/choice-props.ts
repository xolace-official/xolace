import type { StyleProp, ViewStyle } from "react-native";

export type Choice<T extends string> = { id: T; label: string };

export type ChoiceProps<T extends string> = {
	options: readonly Choice<T>[];
	value: T;
	onChange: (value: T) => void;
};

export type SegmentedProps<T extends string> = ChoiceProps<T> & {
	style?: StyleProp<ViewStyle>;
	className?: string;
	haptic?: () => void;
};

export const labelOf = <T extends string>(
	options: readonly Choice<T>[],
	value: T
): string => options.find((o) => o.id === value)?.label ?? value;

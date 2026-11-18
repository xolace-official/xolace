import { Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { Presets } from "react-native-pulsar";
import { useResolveClassNames } from "uniwind";
import type { SegmentedProps } from "@/components/shared/choice-props";
import { ThemedHost } from "@/components/shared/themed-host";
import { cn } from "@/lib/cn";

/**
 * The control's height on iOS 26 at the default text size. `matchContents` only
 * learns the real height once the Host is on screen, so until then (a tab
 * mounted out of sight) it lays out at 0 and jumps on first show. Reserving the
 * height keeps the first frame in place; a larger control still grows the Host.
 */
const SEGMENTED_HEIGHT = 31;

/**
 * SwiftUI's segmented control with the selection tick. `Host` doesn't take
 * `className`, so the classes are resolved to a style here.
 */
export function Segmented<T extends string>({
	options,
	value,
	onChange,
	style,
	className,
	haptic = Presets.System.selection,
}: SegmentedProps<T>) {
	const resolved = useResolveClassNames(cn("self-stretch", className));
	return (
		<ThemedHost
			matchContents={{ vertical: true }}
			style={[{ minHeight: SEGMENTED_HEIGHT }, resolved, style]}
		>
			<Picker
				modifiers={[pickerStyle("segmented")]}
				onSelectionChange={(next: T) => {
					haptic();
					onChange(next);
				}}
				selection={value}
			>
				{options.map((o) => (
					<Text key={o.id} modifiers={[tag(o.id)]}>
						{o.label}
					</Text>
				))}
			</Picker>
		</ThemedHost>
	);
}

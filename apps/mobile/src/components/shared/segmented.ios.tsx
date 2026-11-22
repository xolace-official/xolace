import { Picker, Text } from "@expo/ui/swift-ui";
import { pickerStyle, tag } from "@expo/ui/swift-ui/modifiers";
import { Presets } from "react-native-pulsar";
import { useResolveClassNames } from "uniwind";
import type { SegmentedProps } from "@/components/shared/choice-props";
import { ThemedHost } from "@/components/shared/themed-host";
import { cn } from "@/lib/cn";

const SEGMENTED_HEIGHT = 31;

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

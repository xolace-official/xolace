import {
	SegmentedButton,
	SingleChoiceSegmentedButtonRow,
	Text,
} from "@expo/ui/jetpack-compose";
import { Presets } from "react-native-pulsar";
import { useResolveClassNames } from "uniwind";
import type { SegmentedProps } from "@/components/shared/choice-props";
import { ThemedHost } from "@/components/shared/themed-host";
import { cn } from "@/lib/cn";

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
		<ThemedHost matchContents={{ vertical: true }} style={[resolved, style]}>
			<SingleChoiceSegmentedButtonRow>
				{options.map((o) => (
					<SegmentedButton
						key={o.id}
						onClick={() => {
							haptic();
							onChange(o.id);
						}}
						selected={o.id === value}
					>
						<SegmentedButton.Label>
							<Text>{o.label}</Text>
						</SegmentedButton.Label>
					</SegmentedButton>
				))}
			</SingleChoiceSegmentedButtonRow>
		</ThemedHost>
	);
}

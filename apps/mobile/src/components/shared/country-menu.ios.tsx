import { Button, HStack, Image, Menu, Text } from "@expo/ui/swift-ui";
import {
	background,
	font,
	foregroundStyle,
	padding,
	shapes,
} from "@expo/ui/swift-ui/modifiers";
import { Presets } from "react-native-pulsar";
import { type ChoiceProps, labelOf } from "@/components/shared/choice-props";
import { ThemedHost } from "@/components/shared/themed-host";
import { useTokenColor } from "@/lib/use-token-color";

const CHIP_PADDING = { horizontal: 12, vertical: 7 };
const CHIP_FONT = { size: 13, weight: "semibold" } as const;
const CHEVRON = 10;
const GAP = 4;

/** The country chip: a native menu with the current choice ticked. */
export function CountryMenu<T extends string>({
	options,
	value,
	onChange,
}: ChoiceProps<T>) {
	const surface = useTokenColor("surface");
	const foreground = useTokenColor("foreground");
	return (
		<ThemedHost matchContents>
			<Menu
				label={
					<HStack
						modifiers={[
							padding(CHIP_PADDING),
							background(surface, shapes.capsule()),
						]}
						spacing={GAP}
					>
						<Text modifiers={[font(CHIP_FONT), foregroundStyle(foreground)]}>
							{labelOf(options, value)}
						</Text>
						<Image
							color={foreground}
							size={CHEVRON}
							systemName="chevron.down"
						/>
					</HStack>
				}
			>
				{options.map((o) => (
					<Button
						key={o.id}
						label={o.label}
						onPress={() => {
							Presets.System.selection();
							onChange(o.id);
						}}
						systemImage={o.id === value ? "checkmark" : undefined}
					/>
				))}
			</Menu>
		</ThemedHost>
	);
}

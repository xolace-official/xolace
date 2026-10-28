import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { View } from "react-native";
import { Tour } from "@/components/ui/tour";
import { TOUR_STEPS } from "@/features/reflect/tour-copy";
import { a11yHidden } from "@/lib/utils";

const WAVEFORM_NAME = {
	android: "graphic_eq",
	ios: "waveform",
	web: "graphic_eq",
} as const;

/**
 * The tour's step for the talk door.
 *
 * The door is a native header button (`Stack.Toolbar` in reflect-screen), so
 * there is no view of ours around it to measure or cut a hole for. Instead this
 * lays an empty view over the header row, from the top of the screen to
 * `height`: it places the card directly under the toolbar, and with `cutout`
 * off the dim stays whole. The card carries the waveform itself, so the reader
 * knows which button up there it means.
 */
export const TalkTourStep = ({ height }: { height: number }) => {
	const foreground = useThemeColor("overlay-foreground") as string;

	return (
		<Tour.Step
			cutout={false}
			description={TOUR_STEPS[4].description}
			icon={
				// Decorative: the sentence beside it already names the waveform.
				<View
					className="size-10 items-center justify-center rounded-full border border-border bg-surface"
					{...a11yHidden(true)}
				>
					<SymbolView name={WAVEFORM_NAME} size={18} tintColor={foreground} />
				</View>
			}
			order={4}
			padding={0}
			placement="bottom"
			pointerEvents="none"
			style={{ height, left: 0, position: "absolute", right: 0, top: 0 }}
			title={TOUR_STEPS[4].title}
		/>
	);
};

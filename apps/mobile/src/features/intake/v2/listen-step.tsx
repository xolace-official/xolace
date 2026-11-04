// `listen`: Flux listening while the user talks, their words showing as they come. Stopping
// goes to `interpret`; a denied or missing mic goes to `type` (#709).
import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { FluxStill } from "@/features/intake/v2/flux-still";
import type { MicFailure } from "@/features/intake/v2/machine";
import { useListenTake } from "@/features/intake/v2/use-listen-take";
import { formatTime } from "@/lib/format-time";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const FLUX_SIZE = 150;
const STOP_ICON = { android: "stop", ios: "stop.fill", web: "stop" } as const;
const STOP_ICON_SIZE = 24;

type Props = {
	onDone: (transcript: string) => void;
	onUnavailable: (reason: MicFailure) => void;
};

export function ListenStep({ onDone, onUnavailable }: Props) {
	const take = useListenTake({ onDone, onUnavailable });
	const ember = useTokenColor("ember");

	return (
		<View className="flex-1 items-center px-6 pt-4">
			<FluxStill mood="listening" size={FLUX_SIZE} />
			<AppText className="mt-1.5 font-[Poppins-SemiBold] text-[13px] text-ember uppercase tracking-[1px]">
				{take.listening
					? `Listening · ${formatTime(take.seconds)}`
					: "Getting ready…"}
			</AppText>

			<ScrollView
				className="mt-5 flex-1 self-stretch"
				showsVerticalScrollIndicator={false}
			>
				<AppText
					accessibilityLiveRegion="polite"
					className="font-[Poppins-Regular] text-[19px] text-foreground leading-[28px]"
				>
					{take.transcript || (
						<AppText className="text-muted">
							Go ahead, I&apos;m listening.
						</AppText>
					)}
					<AppText className="text-ember">▍</AppText>
				</AppText>
			</ScrollView>

			<View className="items-center pt-4 pb-2">
				<PressableFeedback
					accessibilityLabel="Done talking"
					accessibilityRole="button"
					className="size-[76px] items-center justify-center rounded-full border-2 border-ember bg-surface"
					isDisabled={take.stopping}
					onPress={() => {
						playSoftPress();
						take.stop();
					}}
				>
					<SymbolView
						name={STOP_ICON}
						size={STOP_ICON_SIZE}
						tintColor={ember}
					/>
				</PressableFeedback>
				<AppText className="mt-2.5 font-[Poppins-Regular] text-[14px] text-muted">
					Tap when you&apos;re done
				</AppText>
			</View>
		</View>
	);
}

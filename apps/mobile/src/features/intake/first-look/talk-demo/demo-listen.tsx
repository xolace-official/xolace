// The demo's one take (#714): the intake's listen take, shorter. Their words show as they
// come; stopping sends them, a denied or missing mic goes to typing.
import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { useListenTake } from "@/features/intake/v2/use-listen-take";
import { formatTime } from "@/lib/format-time";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

/** One thing said, not a talk: the take stops itself here. */
const DEMO_TAKE_SECONDS = 30;
const STOP_ICON = { android: "stop", ios: "stop.fill", web: "stop" } as const;
const STOP_ICON_SIZE = 22;

type Props = {
	onDone: (transcript: string) => void;
	onUnavailable: () => void;
};

export function DemoListen({ onDone, onUnavailable }: Props) {
	const take = useListenTake({
		maxSeconds: DEMO_TAKE_SECONDS,
		onDone,
		onUnavailable,
	});
	const ember = useTokenColor("ember");

	return (
		<View className="items-center gap-3 px-5 pt-2">
			<AppText
				accessibilityLiveRegion="polite"
				className="min-h-12 self-stretch text-center font-[Poppins-Regular] text-[17px] text-foreground leading-6"
				ellipsizeMode="head"
				numberOfLines={3}
			>
				{take.transcript || (
					<AppText className="text-muted">
						Go ahead, I&apos;m listening.
					</AppText>
				)}
			</AppText>
			<AppText className="font-[Poppins-SemiBold] text-[13px] text-ember uppercase tracking-[1px]">
				{take.listening
					? `Listening · ${formatTime(take.seconds)}`
					: "Getting ready…"}
			</AppText>
			<PressableFeedback
				accessibilityLabel="Done talking"
				accessibilityRole="button"
				className="size-[68px] items-center justify-center rounded-full border-2 border-ember bg-surface"
				isDisabled={take.stopping}
				onPress={() => {
					playSoftPress();
					take.stop();
				}}
			>
				<SymbolView name={STOP_ICON} size={STOP_ICON_SIZE} tintColor={ember} />
			</PressableFeedback>
		</View>
	);
}

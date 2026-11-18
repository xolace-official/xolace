import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "@/features/you/copy";
import { Gauge } from "@/features/you/steadiness/dial/gauge";
import { NoticedList } from "@/features/you/steadiness/notes";
import { useSteadinessScreen } from "@/features/you/steadiness/steadiness-data";
import { Surface } from "@/features/you/surface";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const S = COPY.steadinessScreen;
const INFO = { android: "info", ios: "info.circle" } as const;

/** The glass dial card: the gauge, then what Xolace noticed (Xolace+) or how far from lighting
 * it is; ⓘ opens the face sheet. */
export function DialCard({ running }: { running: boolean }) {
	const { state, actions } = useSteadinessScreen();
	const subtle = useTokenColor("subtle");
	if (!state) {
		return null;
	}
	const { dial, plus, doors, now } = state;
	return (
		<Surface className="items-center pt-5.5 pb-5" radius={28}>
			<Gauge
				dial={dial}
				doors={doors}
				now={now}
				onLocked={actions.numbers}
				plus={plus}
				running={running}
			/>
			{dial.lit ? (
				<NoticedList className="mx-5 mt-4" items={dial.noticed} />
			) : (
				<View className="mt-1.5 px-9">
					<AppText
						className="text-center text-[15px] text-foreground/75 leading-[22.5px]"
						variant="body"
					>
						{S.wait}
					</AppText>
					<AppText
						className="mt-1 text-center text-[12.5px] leading-[18px]"
						color="subtle"
						variant="caption"
					>
						{S.soFar(dial.known)}
					</AppText>
				</View>
			)}
			<PressScale
				accessibilityLabel={S.faceLabel}
				accessibilityRole="button"
				className="absolute top-2.5 right-2.5 p-1"
				haptic={playSoftPress}
				hitSlop={8}
				onPress={actions.faceInfo}
			>
				<Icon color={subtle} name={INFO} size={22} weight="regular" />
			</PressScale>
		</Surface>
	);
}

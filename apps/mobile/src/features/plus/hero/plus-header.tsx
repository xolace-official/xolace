import { ActivityIndicator, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { useTokenColor } from "@/lib/use-token-color";
import { PLUS } from "../copy";
import { usePlusScreen } from "../plus-data";

/** The title's top, under the chip row: Flux's postcard shows through above it. */
const TITLE_TOP = 116;

/** The Xolace+ chip and Restore, then the title and the surface's own line. */
export function PlusHeader() {
	const { state, actions } = usePlusScreen();
	const fg = useTokenColor("foreground");
	return (
		<View>
			<View className="flex-row flex-wrap items-center justify-between gap-2">
				<View className="min-h-7.5 justify-center rounded-full bg-ember/18 px-3 py-1">
					<AppText className="text-[13px] text-ember" weight="bold">
						{PLUS.chip}
					</AppText>
				</View>
				<PressScale
					accessibilityLabel={PLUS.restoreLabel}
					accessibilityState={{ busy: state.restoring }}
					className="min-h-10 justify-center"
					disabled={state.restoring || state.exiting}
					onPress={actions.restore}
				>
					{/* A pill, so it reads on Flux's night postcard in the light theme too. */}
					<View className="min-h-7.5 min-w-18 items-center justify-center rounded-full bg-background/70 px-3 py-1">
						{state.restoring ? (
							<ActivityIndicator color={fg} size="small" />
						) : (
							<AppText className="text-[13px]" weight="semibold">
								{PLUS.restore}
							</AppText>
						)}
					</View>
				</PressScale>
			</View>
			<View className="gap-2.5" style={{ marginTop: TITLE_TOP }}>
				<AppText
					accessibilityRole="header"
					className="font-display text-[30px] leading-[32px] tracking-[-0.9px]"
				>
					{PLUS.title}
				</AppText>
				{state.line && (
					<AppText className="text-[15px] leading-[21px]" color="muted">
						{state.line}
					</AppText>
				)}
			</View>
		</View>
	);
}

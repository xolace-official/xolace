import { ActivityIndicator, ScrollView, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { BackButton } from "@/components/shared/back-button";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { MOMENTS_COPY } from "@/features/you/moments/copy";
import {
	Label,
	MirrorBlock,
	Words,
} from "@/features/you/moments/moment/mirror-block";
import { useMomentScreen } from "@/features/you/moments/moment/moment-data";
import { TalkThread } from "@/features/you/moments/moment/talk-thread";
import { playSoftPress, tap } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { columnPad, useScreen } from "@/lib/wide-layout";

const M = MOMENTS_COPY.moment;
const SHARE = { android: "ios_share", ios: "square.and.arrow.up" } as const;
/** Side padding of the bars (`px-4`) and the page (`px-5`); on wide screens all three hold to one reading column. */
const BAR_PAD = 16;
const PAGE_PAD = 20;

export function MomentScreen() {
	const { state, actions } = useMomentScreen();
	const fg = useTokenColor("foreground");
	const screen = useScreen();
	const barX = columnPad(screen, BAR_PAD);
	const pageX = columnPad(screen, PAGE_PAD);

	if (!state) {
		return (
			<View className="flex-1 bg-surface pt-safe-offset-2">
				<BackButton className="mx-4" />
				<View className="flex-1 items-center justify-center px-10">
					{state === undefined ? (
						<ActivityIndicator />
					) : (
						<AppText center color="muted" variant="callout">
							{M.gone}
						</AppText>
					)}
				</View>
			</View>
		);
	}

	const { moment } = state;
	return (
		<View className="flex-1 bg-surface pt-safe-offset-2">
			<View
				className="flex-row items-center gap-2.5"
				style={{ paddingHorizontal: barX }}
			>
				<BackButton />
				<View className="flex-1">
					<AppText
						accessibilityRole="header"
						variant="subhead"
						weight="semibold"
					>
						{moment.date}
					</AppText>
					<AppText color="muted" variant="footnote">
						{moment.meta}
					</AppText>
				</View>
			</View>
			<ScrollView
				contentContainerClassName="gap-5.5 pt-6.5 pb-6"
				contentContainerStyle={{ paddingHorizontal: pageX }}
				showsVerticalScrollIndicator={false}
			>
				{moment.said ? (
					<View className="gap-2">
						<Label>{M.youSaid}</Label>
						<View className="rounded-[20px] border-continuous bg-surface-secondary px-4 py-3.5">
							<AppText className="leading-6" selectable variant="subhead">
								{moment.said}
							</AppText>
						</View>
					</View>
				) : null}
				{moment.mirror ? (
					<MirrorBlock
						audio={state.audio}
						moment={moment}
						onToggle={actions.toggleAudio}
					/>
				) : null}
				<Words words={moment.words} />
				{state.thread.length > 0 ? (
					<View className="gap-2.5">
						<Label>{M.theTalk}</Label>
						<TalkThread lines={state.thread} name={state.companion} />
					</View>
				) : null}
			</ScrollView>
			<View
				className="mb-2 flex-row gap-2.5 pt-2 pb-safe-or-4"
				style={{ paddingHorizontal: barX }}
			>
				<PressScale
					accessibilityRole="button"
					className="h-13.5 flex-1 items-center justify-center rounded-[27px] bg-foreground"
					haptic={playSoftPress}
					onPress={actions.again}
				>
					<AppText
						className="text-[16px]"
						color="background"
						variant="body"
						weight="semibold"
					>
						{M.again}
					</AppText>
				</PressScale>
				{moment.mirror ? (
					<PressScale
						accessibilityLabel={M.share}
						accessibilityRole="button"
						className="size-13.5 items-center justify-center rounded-full bg-surface-secondary"
						haptic={tap}
						onPress={actions.share}
					>
						<Icon color={fg} name={SHARE} size={18} />
					</PressScale>
				) : null}
			</View>
		</View>
	);
}

import { useEffect, useEffectEvent, useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { InfoButton, InfoTip } from "@/components/shared/info-tip";
import { COPY } from "@/features/you/copy";
import type { IntensityWeek } from "@/features/you/home/use-you-week";
import {
	heldReadout,
	weekA11y,
	weekSentence,
} from "@/features/you/home/week/week-model";
import {
	EarlierWeeksGate,
	WeekArrows,
} from "@/features/you/home/week/week-pager";
import { WeekPlot } from "@/features/you/home/week/week-plot";
import { useYouHome } from "@/features/you/home/you-data";
import { useYouUi } from "@/features/you/home/you-ui";
import { Surface } from "@/features/you/surface";
import { tap } from "@/lib/haptics";

const TIP_TOP = 56;
const CAPTION_MIN_SCALE = 0.8;

export function WeekCard({ week }: { week: IntensityWeek }) {
	const { actions } = useYouHome();
	const { weekHeld } = useYouUi();
	const { fontScale } = useWindowDimensions();
	const [info, setInfo] = useState(false);
	const [held, setHeld] = useState<number | null>(weekHeld);
	const seen = useEffectEvent(actions.weekSeen);
	useEffect(() => {
		seen();
	}, []);

	const current = week.offset === 0;
	const sentence = weekSentence({
		current,
		days: week.days,
		usual: week.usual,
	});
	const todayIndex = week.days.findIndex((d) => d.isToday);
	const readout =
		held === null
			? null
			: heldReadout({
					days: week.days,
					fontScale,
					index: held,
					start: week.start,
					todayIndex,
					usual: week.usual,
				});
	const onHeld = (i: number | null) => {
		if (i !== null) {
			tap();
		}
		setHeld(i);
	};

	return (
		<Surface className="overflow-hidden">
			<View className="p-4">
				{readout ? (
					<View className="min-h-11 justify-center">
						<AppText
							className="text-[17px] leading-[22px] tracking-[-0.17px]"
							numberOfLines={1}
							variant="headline"
						>
							{readout.value}
						</AppText>
						{readout.caption ? (
							<AppText
								adjustsFontSizeToFit
								className="mt-0.75 text-[12.5px] leading-4"
								color="muted"
								minimumFontScale={CAPTION_MIN_SCALE}
								numberOfLines={1}
								variant="footnote"
							>
								{readout.caption}
							</AppText>
						) : null}
					</View>
				) : (
					<View className="min-h-11 flex-row items-center gap-1.75">
						<AppText
							accessibilityRole="header"
							className="text-[17px] leading-[22px] tracking-[-0.17px]"
							variant="headline"
						>
							{week.label}
						</AppText>
						<InfoButton
							label={COPY.week.infoLabel(week.label)}
							onPress={() => setInfo((v) => !v)}
						/>
						{week.pager ? (
							<WeekArrows
								canNext={!current}
								canPrev={!week.earliest}
								onPage={actions.pageWeek}
							/>
						) : null}
					</View>
				)}

				<WeekPlot
					days={week.days}
					initialHeld={weekHeld}
					key={week.offset}
					label={weekA11y(week.days, week.usual)}
					onHeld={onHeld}
					usual={week.usual}
				/>

				<AppText
					className="mt-3 text-[13px] leading-[18px]"
					color="muted"
					variant="footnote"
				>
					{sentence}
				</AppText>
			</View>

			{week.pager ? null : (
				<EarlierWeeksGate onPress={actions.openEarlierWeeks} />
			)}

			{info ? (
				<InfoTip
					body={week.pager ? COPY.week.infoPlus : COPY.week.infoFree}
					onClose={() => setInfo(false)}
					title={week.label}
					top={TIP_TOP}
				/>
			) : null}
		</Surface>
	);
}

import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
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
import { InfoButton, InfoTip } from "@/features/you/info-tip";
import { Surface } from "@/features/you/surface";
import { tap } from "@/lib/haptics";

/** The ⓘ's explanation sits under the title row. */
const TIP_TOP = 56;

/**
 * This week (you.md §6): production's intensity card with your usual, a held day's readout in
 * place of the title row (same height), and a sentence that says something. Xolace+ pages
 * weeks with the arrows; free users get production's frosted earlier-weeks gate.
 */
export function WeekCard({ week }: { week: IntensityWeek }) {
	const { actions } = useYouHome();
	const { weekHeld } = useYouUi();
	const [info, setInfo] = useState(false);
	const [held, setHeld] = useState<number | null>(weekHeld);
	const seen = useRef(false);
	const { weekSeen } = actions;

	// Production's teaser analytics, once.
	useEffect(() => {
		if (!seen.current) {
			seen.current = true;
			weekSeen();
		}
	}, [weekSeen]);

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
							variant="headline"
						>
							{readout.value}
						</AppText>
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

				{/* Keyed by week: a new week's bars re-grow from the baseline. */}
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

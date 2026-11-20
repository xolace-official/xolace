import { useRef } from "react";
import { View, type ViewInstance } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { RollDigits } from "@/components/shared/roll-digits";
import { COPY } from "@/features/you/copy";
import { WeekRow } from "@/features/you/home/streak/week-row";
import { useYouHome } from "@/features/you/home/you-data";
import { freezeCopy } from "@/features/you/home/you-model";
import { useYouUi } from "@/features/you/home/you-ui";
import { Surface } from "@/features/you/surface";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";

const TIP_GAP = 8;

export function StreakCard() {
	const { state } = useYouHome();
	const { toggleTip, placeTip } = useYouUi();
	const card = useRef<ViewInstance>(null);
	const streak = state.streak;
	if (!streak) {
		return null;
	}
	const lit = streak.streak > 0;
	const measure = (then: (top: number) => void) =>
		card.current?.measureInWindow((_x, y, _w, h) => then(y + h + TIP_GAP));

	return (
		<View
			className="mt-6 self-stretch"
			onLayout={() => measure(placeTip)}
			ref={card}
		>
			<Surface className="px-4 pt-4 pb-3.5" radius={26}>
				<View
					accessibilityLabel={streak.label}
					accessible
					className="flex-row items-center gap-1.75"
				>
					{lit ? (
						<>
							<RollDigits
								className="text-[32px] text-ember tabular-nums tracking-[-0.64px]"
								lineHeight={34}
								value={streak.streak}
								variant="display"
							/>
							<AppText
								className="text-[15px] leading-5"
								variant="callout"
								weight="semibold"
							>
								{COPY.streak.daysInRow(streak.streak)}
							</AppText>
						</>
					) : (
						<AppText
							className="text-[15.5px] leading-5"
							variant="callout"
							weight="semibold"
						>
							{COPY.streak.ended}
						</AppText>
					)}
					<View className="flex-1" />
					{streak.best === null ? null : (
						<AppText className="text-[13px]" color="muted" variant="footnote">
							{COPY.streak.best(streak.best)}
						</AppText>
					)}
				</View>

				<WeekRow />

				<View className="mt-3 flex-row border-separator border-t-[0.5px] pt-3">
					<Stat label={streak.momentsLabel} value={String(streak.moments)} />
					<Divider />
					<Stat
						label={COPY.streak.usualDay}
						spoken={
							streak.usualDay === COPY.streak.none
								? COPY.streak.noUsualDay
								: undefined
						}
						value={streak.usualDay}
					/>
					<Divider />
					<FreezeStat
						freezes={streak.freezes}
						lit={lit}
						onPress={() => measure(toggleTip)}
					/>
				</View>
			</Surface>
		</View>
	);
}

function Divider() {
	return <View className="w-[0.5px] self-stretch bg-separator" />;
}

function Stat({
	value,
	label,
	spoken,
}: {
	value: string;
	label: string;
	spoken?: string;
}) {
	return (
		<View
			accessibilityLabel={spoken ?? `${value} ${label}`}
			accessible
			className="flex-1 items-center gap-0.5"
		>
			<AppText
				className="text-[19px] leading-[23px] tracking-[-0.2px]"
				variant="headline"
			>
				{value}
			</AppText>
			<AppText
				className="text-[11.5px] leading-3.5"
				color="muted"
				variant="caption"
			>
				{label}
			</AppText>
		</View>
	);
}

function FreezeStat({
	freezes,
	lit,
	onPress,
}: {
	freezes: number;
	lit: boolean;
	onPress: () => void;
}) {
	const frost = useTokenColor("frost");
	const subtle = useTokenColor("subtle");
	const { label, hint } = freezeCopy(freezes, lit);
	const has = freezes > 0;
	return (
		<PressScale
			accessibilityLabel={`${label}. ${hint}`}
			accessibilityRole="button"
			className="flex-1 items-center gap-0.5"
			haptic={playSoftPress}
			onPress={onPress}
		>
			<View className="min-h-[23px] flex-row items-center gap-1.25">
				<Icon
					color={has ? frost : subtle}
					name={{ android: "ac_unit", ios: "snowflake" }}
					size={16}
					style={{ opacity: has ? 1 : 0.6 }}
					weight="semibold"
				/>
				<RollDigits
					className={`text-[19px] tracking-[-0.2px] ${has ? "text-frost" : "text-subtle"}`}
					lineHeight={23}
					value={freezes}
					variant="headline"
				/>
			</View>
			<AppText
				className="text-[11.5px] leading-3.5"
				color="muted"
				variant="caption"
			>
				{COPY.streak.freeze.unit(freezes)}
			</AppText>
		</PressScale>
	);
}

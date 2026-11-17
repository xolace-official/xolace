import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Pressable, View } from "react-native";
import { Presets } from "react-native-pulsar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "../copy";
import { useFollowUpSheet } from "./follow-up-data";

/** Board `.sh`: 26 / 20; `.shh` 0 16 0 22, gap 12; `.nn` 36 tall, 14 in; `.shs` 6 / 22 / 10; `.sr` 50, 22 in. */
const SH = {
	bottom: 20,
	gap: 12,
	left: 22,
	pill: 36,
	pillX: 14,
	right: 16,
	row: 50,
	subBelow: 10,
	subTop: 6,
	top: 26,
} as const;

/**
 * The heavier follow-up (handoff §5.6), a native form sheet sized to fit:
 * production's question and rows for the answer's depth, "Not now", and one tap
 * answers it. A row saves, closes, and moment 2 follows; Not now or a swipe
 * down closes it without an answer. Opened with nothing to ask, it closes.
 */
export function FollowUpSheet() {
	const insets = useSafeAreaInsets();
	const { state, actions } = useFollowUpSheet();
	const answered = useRef(false);
	const answer = useRef(actions.answer);
	const { open } = state;

	useEffect(() => {
		answer.current = actions.answer;
	});
	// Gone any other way (a swipe down): as Not now.
	useEffect(
		() => () => {
			if (!answered.current) {
				answer.current(null);
			}
		},
		[]
	);
	useEffect(() => {
		if (!(open || answered.current)) {
			answered.current = true;
			router.back();
		}
	}, [open]);

	const close = (key: string | null) => {
		if (answered.current) {
			return;
		}
		answered.current = true;
		if (key) {
			Presets.System.selection();
		}
		router.back();
		actions.answer(key);
	};

	return (
		<View
			style={{
				paddingBottom: Math.max(insets.bottom, SH.bottom),
				paddingTop: SH.top,
			}}
		>
			<View
				className="flex-row items-start"
				style={{ gap: SH.gap, paddingLeft: SH.left, paddingRight: SH.right }}
			>
				<AppText
					accessibilityRole="header"
					className="mt-1 flex-1 text-[20px] leading-[25px] tracking-[-0.3px]"
					variant="headline"
				>
					{state.question.ask}
				</AppText>
				<PressScale
					accessibilityLabel={COPY.followUp.notNow}
					className="justify-center rounded-full bg-surface-secondary"
					onPress={() => close(null)}
					style={{ height: SH.pill, paddingHorizontal: SH.pillX }}
				>
					<AppText
						className="text-[14.5px]"
						variant="callout"
						weight="semibold"
					>
						{COPY.followUp.notNow}
					</AppText>
				</PressScale>
			</View>
			<AppText
				className="text-[14px] leading-[19px]"
				color="muted"
				style={{
					marginBottom: SH.subBelow,
					marginHorizontal: SH.left,
					marginTop: SH.subTop,
				}}
				variant="callout"
			>
				{COPY.followUp.sub}
			</AppText>
			{state.question.rows.map((row) => (
				<Pressable
					accessibilityRole="button"
					className="justify-center border-t-[0.5px] border-t-separator bg-transparent active:bg-surface-secondary"
					key={row.key}
					onPress={() => close(row.key)}
					style={{ minHeight: SH.row, paddingHorizontal: SH.left }}
				>
					<AppText variant="body">{row.label}</AppText>
				</Pressable>
			))}
		</View>
	);
}

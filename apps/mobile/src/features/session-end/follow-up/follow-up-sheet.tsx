import { router } from "expo-router";
import { useEffect, useEffectEvent, useRef } from "react";
import { Pressable, View } from "react-native";
import { Presets } from "react-native-pulsar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "../copy";
import { useFollowUpSheet } from "./follow-up-data";

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

export function FollowUpSheet() {
	const insets = useSafeAreaInsets();
	const { state, actions } = useFollowUpSheet();
	const answered = useRef(false);
	const { open } = state;

	const dismissed = useEffectEvent(() => {
		if (!answered.current) {
			actions.answer(null);
		}
	});
	useEffect(() => () => dismissed(), []);
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

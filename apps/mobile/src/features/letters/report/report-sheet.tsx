import { useRef, useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";
import { LETTERS, REPORT_REASONS, type ReportReason } from "../copy";
import { useReportSheet } from "./report-data";

const BOTTOM = 18;

export function ReportSheet() {
	const { state, actions } = useReportSheet();
	const insets = useSafeAreaInsets();
	const [reason, setReason] = useState<ReportReason | null>(state.reason);
	const sent = useRef(false);
	const r = LETTERS.report;
	const send = () => {
		if (reason && !sent.current) {
			sent.current = true;
			actions.report(reason);
		}
	};
	return (
		<View
			className="gap-2 px-4 pt-[26px]"
			style={{ paddingBottom: Math.max(insets.bottom, BOTTOM) }}
		>
			<AppText
				accessibilityRole="header"
				className="mx-2 mb-1"
				variant="headline"
			>
				{r.title}
			</AppText>
			<View accessibilityRole="radiogroup" className="gap-2">
				{REPORT_REASONS.map((key) => (
					<PressScale
						accessibilityRole="radio"
						accessibilityState={{ checked: reason === key }}
						className={cn(
							"min-h-[52px] justify-center rounded-2xl border-[1.5px] border-continuous bg-surface-secondary px-4 py-2",
							reason === key ? "border-foreground" : "border-transparent"
						)}
						key={key}
						onPress={() => setReason(key)}
					>
						<AppText variant="body" weight="semibold">
							{r.reasons[key]}
						</AppText>
					</PressScale>
				))}
			</View>
			<PressScale
				accessibilityHint={r.note}
				accessibilityRole="button"
				accessibilityState={{ disabled: !reason }}
				className={cn(
					"mx-4 mt-2 min-h-[50px] items-center justify-center rounded-full py-2",
					reason ? "bg-foreground" : "bg-surface-secondary"
				)}
				disabled={!reason}
				onPress={send}
			>
				<AppText
					color={reason ? "background" : "subtle"}
					variant="body"
					weight="semibold"
				>
					{r.send}
				</AppText>
			</PressScale>
			<AppText
				accessibilityElementsHidden
				className="mt-1 text-center"
				color="subtle"
				variant="footnote"
			>
				{r.note}
			</AppText>
		</View>
	);
}

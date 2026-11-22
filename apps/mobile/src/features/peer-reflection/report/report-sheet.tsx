import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "../copy";
import { useReportSheet } from "./report-sheet-data";

const SHEET_BOTTOM = 18;

export function ReportSheetView() {
	const insets = useSafeAreaInsets();
	const { actions } = useReportSheet();
	return (
		<View
			className="pt-[26px]"
			style={{ paddingBottom: Math.max(insets.bottom, SHEET_BOTTOM) }}
		>
			<AppText
				accessibilityRole="header"
				className="mx-[22px] mb-2 text-[13px] leading-[18px]"
				color="subtle"
				variant="footnote"
			>
				{COPY.sheet.title}
			</AppText>
			{COPY.sheet.reasons.map((r) => (
				<Row
					key={r.value}
					label={r.label}
					onPress={() => actions.pick(r.value)}
				/>
			))}
			<View className="mx-[22px] my-1.5 h-px bg-separator" />
			<Row faint label={COPY.sheet.cancel} onPress={actions.cancel} />
		</View>
	);
}

function Row({
	label,
	faint = false,
	onPress,
}: {
	label: string;
	faint?: boolean;
	onPress: () => void;
}) {
	return (
		<PressScale
			accessibilityLabel={label}
			accessibilityRole="button"
			className="h-12 justify-center px-[22px]"
			onPress={onPress}
		>
			<AppText
				className="text-[17px] leading-[22px]"
				color={faint ? "subtle" : "foreground"}
				variant="body"
			>
				{label}
			</AppText>
		</PressScale>
	);
}

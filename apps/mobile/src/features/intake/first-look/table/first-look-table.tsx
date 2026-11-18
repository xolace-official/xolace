// What's free and what Plus adds, both columns from the first frame. The Plus column lights
// row by row on the arrival clock, behind its band.
import { View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { FIRST_LOOK, type RowId, type VoiceId } from "../copy";
import { Band, FREE_COL, PLUS_COL } from "./table-marks";
import { TableRow } from "./table-row";

const HEAD_MAX_SCALE = 1.3;

type Props = {
	clock: SharedValue<number>;
	/** The row the person opened, which VoiceOver moves into. */
	focused: RowId | null;
	mounted: readonly RowId[];
	onHeight: (id: RowId, height: number) => void;
	onToggle: (id: RowId) => void;
	onVoice: (voice: VoiceId) => void;
	open: RowId | null;
	reduced: boolean;
	voice: VoiceId;
};

export function FirstLookTable({ focused, mounted, open, ...rest }: Props) {
	return (
		<View
			accessibilityLabel={FIRST_LOOK.a11y.table}
			className="mt-3.5 rounded-card border border-separator bg-surface pr-[5px] pb-[5px] pl-[15px] shadow-card"
		>
			<Band clock={rest.clock} />
			<View
				accessibilityElementsHidden
				className="h-7.5 flex-row items-end pb-0.5"
				importantForAccessibility="no-hide-descendants"
			>
				<View className="flex-1" />
				<AppText
					center
					color="subtle"
					maxFontSizeMultiplier={HEAD_MAX_SCALE}
					style={{ width: FREE_COL }}
					variant="caption"
					weight="semibold"
				>
					{FIRST_LOOK.free}
				</AppText>
				<AppText
					center
					color="emberInk"
					maxFontSizeMultiplier={HEAD_MAX_SCALE}
					style={{ width: PLUS_COL }}
					variant="caption"
					weight="semibold"
				>
					{FIRST_LOOK.plus}
				</AppText>
			</View>
			{FIRST_LOOK.rows.map((row, i) => (
				<TableRow
					{...rest}
					focus={focused === row.id}
					index={i}
					key={row.id}
					mounted={mounted.includes(row.id)}
					open={open === row.id}
					row={row}
				/>
			))}
		</View>
	);
}

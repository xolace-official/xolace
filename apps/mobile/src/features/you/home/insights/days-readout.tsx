import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { COPY } from "@/features/you/copy";
import { type IndexedHistory, readout } from "@/features/you/home/days-model";
import { InfoButton } from "@/features/you/info-tip";

export function DaysReadout({
	dayKey,
	history,
	onInfo,
}: {
	dayKey: string | null;
	history: IndexedHistory;
	onInfo: () => void;
}) {
	const { value, caption } = readout(dayKey, history);
	return (
		<View className="mb-2.5 min-h-10.5">
			<AppText
				className="text-[17px] leading-[22px] tracking-[-0.17px]"
				variant="headline"
			>
				{value}
			</AppText>
			{caption ? (
				<AppText
					className="mt-0.75 text-[12.5px] leading-4"
					color="muted"
					variant="footnote"
				>
					{caption}
				</AppText>
			) : (
				<View className="mt-0.75 flex-row items-center gap-1.5">
					<InfoButton label={COPY.days.infoLabel} onPress={onInfo} />
					<AppText
						className="text-[11.5px] leading-[15px]"
						color="muted"
						variant="caption"
					>
						{COPY.days.hint}
					</AppText>
				</View>
			)}
		</View>
	);
}

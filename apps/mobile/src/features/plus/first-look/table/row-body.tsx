import type { ComponentRef, Ref } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { FIRST_LOOK } from "../copy";
import { useFirstLookData } from "../first-look-data";
import { RingsPreview } from "../previews/rings-preview";
import { SupportPreview } from "../previews/support-preview";
import { TalkPreview } from "../previews/talk-preview";
import { VoicesPreview } from "../previews/voices-preview";
import type { RowProps } from "./table-row";

type Props = Omit<RowProps, "onHeight"> & {
	onHeight: (height: number) => void;
	ref: Ref<ComponentRef<typeof View>>;
};

export function RowBody({
	onHeight,
	onVoice,
	open,
	reduced,
	ref,
	row,
	voice,
}: Props) {
	const { tryTalk } = useFirstLookData().actions;
	const example = row.id === "ste";
	return (
		<View
			className="absolute inset-x-0 top-0 pb-2"
			onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
			ref={ref}
		>
			<AppText
				accessibilityLabel={
					example ? `${row.line} ${FIRST_LOOK.example}.` : undefined
				}
				className="mb-2.5"
				color="muted"
				variant="detail"
			>
				{row.line}
				{example ? " " : ""}
				{example ? (
					<View className="ml-[3px] h-4.5 justify-center rounded-full bg-surface-secondary px-[7px]">
						<AppText color="subtle" variant="caption" weight="semibold">
							{FIRST_LOOK.example}
						</AppText>
					</View>
				) : null}
			</AppText>
			{row.id === "talk" ? (
				<TalkPreview onTry={tryTalk} open={open} reduced={reduced} />
			) : null}
			{row.id === "sup" ? (
				<SupportPreview open={open} reduced={reduced} />
			) : null}
			{example ? <RingsPreview open={open} reduced={reduced} /> : null}
			{row.id === "you" ? (
				<VoicesPreview onPick={onVoice} voice={voice} />
			) : null}
		</View>
	);
}

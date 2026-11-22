import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { InkPalette } from "../chrome/quote-ink";
import { QUOTE_COPY } from "../copy";
import { QuoteSheet } from "./quote-sheet";
import { SheetButton } from "./sheet-parts";

export function GateSheet({
	ink,
	what,
	onPlus,
	onClose,
}: {
	ink: InkPalette;
	what: "keep" | "background";
	onPlus: () => void;
	onClose: () => void;
}) {
	const keep = what === "keep";
	const title = keep
		? QUOTE_COPY.sheets.gate
		: QUOTE_COPY.sheets.gateBackground;
	return (
		<QuoteSheet
			closeLabel={QUOTE_COPY.accessibility.close}
			ink={ink}
			label={keep ? QUOTE_COPY.accessibility.plusSheet : title}
			onClose={onClose}
			title={title}
		>
			<AppText
				className="text-[15.5px] leading-[22.5px]"
				style={{ color: ink.sheetText }}
				variant="callout"
			>
				{keep ? QUOTE_COPY.gate : QUOTE_COPY.gateBackground}
			</AppText>
			<View className="flex-row items-center gap-2.5">
				<SheetButton
					ink={ink}
					kind="ghost"
					label={QUOTE_COPY.notNow}
					onPress={onClose}
				/>
				<View className="flex-1" />
				<SheetButton
					ink={ink}
					kind="primary"
					label={QUOTE_COPY.seePlus}
					onPress={onPlus}
				/>
			</View>
		</QuoteSheet>
	);
}

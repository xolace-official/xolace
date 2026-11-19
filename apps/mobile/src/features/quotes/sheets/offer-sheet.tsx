import { useState } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import type { InkPalette } from "../chrome/quote-ink";
import { QUOTE_COPY } from "../copy";
import {
	type DailyQuoteSlot,
	OFFER_SLOT,
	OFFER_SLOTS,
} from "../offer/daily-quote-offer";
import { QuoteSheet } from "./quote-sheet";
import { Segments, SheetButton } from "./sheet-parts";

const C = QUOTE_COPY.dailyQuote;
const SLOT_ITEMS = OFFER_SLOTS.map((id) => ({ id, label: C.slots[id] }));

/**
 * The one-time daily quote offer (B19), after someone first resonates with or keeps a quote:
 * Yes (mornings), Choose time (then the three times), or Not now. Closing it answers nothing,
 * and it isn't shown again on this device either way.
 */
export function OfferSheet({
	ink,
	onAnswer,
	onClose,
}: {
	ink: InkPalette;
	/** A time turns it on; null is Not now. */
	onAnswer: (slot: DailyQuoteSlot | null) => void;
	onClose: () => void;
}) {
	const [choosing, setChoosing] = useState(false);
	const [slot, setSlot] = useState<DailyQuoteSlot>(OFFER_SLOT);
	return (
		<QuoteSheet
			closeLabel={QUOTE_COPY.accessibility.close}
			ink={ink}
			label={C.label}
			onClose={onClose}
			title={C.title}
		>
			<AppText
				className="text-[15.5px] leading-[22.5px]"
				style={{ color: ink.sheetText }}
				variant="callout"
			>
				{C.body}
			</AppText>
			{choosing ? (
				<Segments
					ink={ink}
					items={SLOT_ITEMS}
					onChange={setSlot}
					value={slot}
				/>
			) : null}
			<View className="flex-row items-center gap-2.5">
				<SheetButton
					ink={ink}
					kind="ghost"
					label={QUOTE_COPY.notNow}
					onPress={() => onAnswer(null)}
				/>
				<View className="flex-1" />
				{choosing ? null : (
					<SheetButton
						ink={ink}
						kind="ghost"
						label={C.chooseTime}
						onPress={() => setChoosing(true)}
					/>
				)}
				<SheetButton
					ink={ink}
					kind="primary"
					label={choosing ? C.send : C.yes}
					onPress={() => onAnswer(choosing ? slot : OFFER_SLOT)}
				/>
			</View>
		</QuoteSheet>
	);
}

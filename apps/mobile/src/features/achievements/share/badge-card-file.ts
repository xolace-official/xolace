import { type ComponentRef, createRef } from "react";
import type { View } from "react-native";
import { COPY } from "@/features/achievements/copy";
import { CARD_PX } from "@/features/achievements/share/badge-card-model";
import { capturePng, shareLocalFile } from "@/lib/share-file";

/** The off-screen card at full size, mounted by the sheet while it is open. */
export const BADGE_CARD_REF = createRef<ComponentRef<typeof View>>();

/** Captures the card at 1080 × 1920 and opens the share sheet with it. */
export async function shareBadgeCard(message: string): Promise<void> {
	const uri = await capturePng(
		BADGE_CARD_REF.current,
		CARD_PX,
		COPY.card.cantMake
	);
	await shareLocalFile(uri, "image", COPY.card.noShare, message);
}

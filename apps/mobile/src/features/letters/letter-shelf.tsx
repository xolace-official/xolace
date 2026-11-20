import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/cn";
import { LETTERS } from "./copy";
import { FoldedLetter } from "./folded-letter";
import { LetterPill } from "./letter-pill";

export function LetterShelf({
	onOpen,
	art,
	className,
}: {
	onOpen: () => void;
	art?: ReactNode;
	className?: string;
}) {
	return (
		<View
			className={cn("flex-row items-center gap-3.5 rounded-2xl p-3", className)}
		>
			{art ?? <FoldedLetter size="shelf" />}
			<View
				accessibilityElementsHidden
				className="flex-1 gap-px"
				importantForAccessibility="no-hide-descendants"
			>
				<AppText variant="subhead" weight="semibold">
					{LETTERS.hub.letterForYou}
				</AppText>
				<AppText color="muted" variant="detail">
					{LETTERS.hub.letterForYouSub}
				</AppText>
			</View>
			<LetterPill
				a11y={`${LETTERS.hub.letterForYou}. ${LETTERS.hub.open}`}
				label={LETTERS.hub.open}
				onPress={onOpen}
			/>
		</View>
	);
}

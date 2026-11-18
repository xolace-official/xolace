import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { cn } from "@/lib/cn";

/**
 * The board's small pill buttons (36 pt) on the offer and the shelf: ink-filled, or plain.
 * Large text grows them; they never clip.
 */
export function LetterPill({
	label,
	onPress,
	plain = false,
	a11y,
}: {
	label: string;
	onPress: () => void;
	plain?: boolean;
	a11y?: string;
}) {
	return (
		<PressScale
			accessibilityLabel={a11y ?? label}
			accessibilityRole="button"
			className={cn(
				"min-h-9 items-center justify-center rounded-full px-4 py-1.5",
				!plain && "bg-foreground"
			)}
			onPress={onPress}
		>
			<AppText
				className="text-[14.5px]"
				color={plain ? "foreground" : "background"}
				variant="callout"
				weight="semibold"
			>
				{label}
			</AppText>
		</PressScale>
	);
}

import { AppText } from "@/components/shared/app-text";
import { GlassButton } from "@/components/shared/glass-button";
import { PressScale } from "@/components/shared/press-scale";

const PILL = "min-h-9 items-center justify-center rounded-full px-4 py-1.5";

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
	const text = (
		<AppText
			className="text-[14.5px]"
			color={plain ? "foreground" : "background"}
			variant="callout"
			weight="semibold"
		>
			{label}
		</AppText>
	);
	const accessibilityLabel = a11y ?? label;
	return plain ? (
		<PressScale
			accessibilityLabel={accessibilityLabel}
			accessibilityRole="button"
			className={PILL}
			onPress={onPress}
		>
			{text}
		</PressScale>
	) : (
		<GlassButton
			accessibilityLabel={accessibilityLabel}
			className={PILL}
			onPress={onPress}
		>
			{text}
		</GlassButton>
	);
}
